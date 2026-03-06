import { AST_NODE_TYPES, ESLintUtils, TSESTree } from '@typescript-eslint/utils';
import type * as ts from 'typescript';
import { SyntaxKind } from 'typescript';

function isUint8ArrayType(type: ts.Type, checker: ts.TypeChecker): boolean {
    const symbol = type.getSymbol();
    if (symbol?.getName() === 'Uint8Array') {
        return true;
    }

    const baseTypes = type.getBaseTypes?.();
    if (baseTypes) {
        for (const baseType of baseTypes) {
            if (isUint8ArrayType(baseType, checker)) {
                return true;
            }
        }
    }

    if (type.isIntersection()) {
        for (const subType of type.types) {
            if (isUint8ArrayType(subType, checker)) {
                return true;
            }
        }
    }

    if (type.isUnion()) {
        return type.types.length > 0 && type.types.every((subType) => isUint8ArrayType(subType, checker));
    }

    const constraint = type.getConstraint?.();
    if (constraint && isUint8ArrayType(constraint, checker)) {
        return true;
    }

    return false;
}

/**
 * Types whose toString() is the dangerous default behavior we want to catch.
 * If toString is declared on any type NOT in this set, it has been
 * intentionally overridden and we should leave it alone.
 */
const DEFAULT_TOSTRING_OWNERS = new Set([
    'Object',
    'Uint8Array',
    'Int8Array',
    'Uint8ClampedArray',
    'Int16Array',
    'Uint16Array',
    'Int32Array',
    'Uint32Array',
    'Float32Array',
    'Float64Array',
    'BigInt64Array',
    'BigUint64Array'
]);

/**
 * Given a ts.Declaration node, walk up the AST parents to find the
 * enclosing class or interface name. This is more reliable than
 * checker.getTypeAtLocation(decl.parent) which can return weird
 * results for .d.ts files where the parent might be the source file.
 */
function getEnclosingClassName(decl: ts.Declaration): string | undefined {
    let current: ts.Node | undefined = decl.parent;
    while (current) {
        if (
            current.kind === SyntaxKind.ClassDeclaration ||
            current.kind === SyntaxKind.ClassExpression ||
            current.kind === SyntaxKind.InterfaceDeclaration
        ) {
            const named = current as ts.Declaration & { name?: ts.Identifier };
            if (named.name) {
                return named.name.text;
            }
        }

        current = current.parent;
    }

    return undefined;
}

/**
 * Checks whether the resolved toString() on this type is a custom
 * override rather than the default Uint8Array/Object prototype version.
 *
 * type.getProperty('toString') returns the most-derived toString symbol
 * visible on the type. We inspect where it is declared to decide if it
 * is a custom override.
 */
function hasCustomToString(type: ts.Type, checker: ts.TypeChecker): boolean {
    const toStringSymbol = type.getProperty('toString');
    if (!toStringSymbol) {
        return false;
    }

    const declarations = toStringSymbol.getDeclarations();
    if (!declarations || declarations.length === 0) {
        return false;
    }

    for (const decl of declarations) {
        const ownerName = getEnclosingClassName(decl);
        if (ownerName && !DEFAULT_TOSTRING_OWNERS.has(ownerName)) {
            return true;
        }
    }

    // Fallback: also check the apparent type, which can differ for
    // branded types or type aliases that wrap a class.
    const apparentType = checker.getApparentType(type);
    if (apparentType !== type) {
        const apparentToString = apparentType.getProperty('toString');
        if (apparentToString && apparentToString !== toStringSymbol) {
            const apparentDecls = apparentToString.getDeclarations();
            if (apparentDecls) {
                for (const decl of apparentDecls) {
                    const ownerName = getEnclosingClassName(decl);
                    if (ownerName && !DEFAULT_TOSTRING_OWNERS.has(ownerName)) {
                        return true;
                    }
                }
            }
        }
    }

    return false;
}

const createRule = ESLintUtils.RuleCreator((name) => `https://github.com/btc-vision/eslint-rules#${name}`);

const rule = createRule({
    name: 'no-uint8array-tostring',
    meta: {
        type: 'problem',
        docs: {
            description:
                'Disallow .toString() on Uint8Array and branded types (Script, Bytes32, etc.) which produces comma-separated decimals instead of hex'
        },
        messages: {
            noUint8ArrayToString:
                '{{typeName}}.toString() returns comma-separated decimals (e.g. "0,32,70,107"), not a hex string. ' +
                'Use Buffer.from(arr).toString("hex") or toHex() instead.'
        },
        schema: []
    },
    defaultOptions: [],
    create(context) {
        const services = ESLintUtils.getParserServices(context);
        const checker = services.program.getTypeChecker();

        return {
            CallExpression(node: TSESTree.CallExpression): void {
                if (
                    node.callee.type !== AST_NODE_TYPES.MemberExpression ||
                    node.callee.property.type !== AST_NODE_TYPES.Identifier ||
                    node.callee.property.name !== 'toString' ||
                    node.arguments.length > 0
                ) {
                    return;
                }

                const objectNode = node.callee.object;
                const tsNode = services.esTreeNodeToTSNodeMap.get(objectNode);
                const type = checker.getTypeAtLocation(tsNode);

                if (!isUint8ArrayType(type, checker)) {
                    return;
                }

                if (hasCustomToString(type, checker)) {
                    return;
                }

                const typeName = checker.typeToString(type);
                context.report({
                    node,
                    messageId: 'noUint8ArrayToString',
                    data: { typeName }
                });
            }
        };
    }
});

const plugin = {
    meta: {
        name: 'eslint-plugin-no-uint8array-tostring',
        version: '1.0.0'
    },
    rules: {
        'no-uint8array-tostring': rule
    }
};

export default plugin;
export { rule };
