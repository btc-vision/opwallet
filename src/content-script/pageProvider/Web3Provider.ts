import { IInteractionParameters } from '@btc-vision/transaction';
import { UnisatProvider } from '@/content-script/pageProvider/index.js';

export type InteractionParametersWithoutSigner = Omit<IInteractionParameters, 'signer'>;

export class Web3Provider {
  protected readonly provider: UnisatProvider;

  constructor(provider: UnisatProvider) {
    this.provider = provider;
  }

  public async signInteraction(interactionParameters: InteractionParametersWithoutSigner): Promise<[string, string]> {
    if('signer' in interactionParameters) {
      throw new Error('signer is not allowed in interaction parameters');
    }

    return this.provider.signInteraction(interactionParameters);
  }
}
