import { DSA } from '../dsa'
import { Spells } from '../spells'


export class Instapool_v2 {
  constructor(private dsa: DSA) { }

  /**
  * Encode Instapool_v2 flashBorrowWithCast calldata arg.
  *
  * @param spells The spells instance
  */
  async encodeFlashCastData(spells: Spells) {
    const encodeSpellsData = await this.dsa.internal.encodeSpells(spells);
    const targetType = Number(this.dsa.instance.version) === 1 ? "address[]" : "string[]"
    let argTypes = [targetType, "bytes[]"];
    return this.dsa.web3.eth.abi.encodeParameters(argTypes, [encodeSpellsData.targets, encodeSpellsData.spells]);
  }
}
