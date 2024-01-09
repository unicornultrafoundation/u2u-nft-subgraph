import { Address, BigInt, log } from "@graphprotocol/graph-ts"
import {
  EIP721AndEIP1155,
  URI,
  Transfer,
  TransferSingle,
  TransferBatch
} from "../generated/EIP721AndEIP1155/EIP721AndEIP1155"
import {Owner, OwnerTokenAmount, OwnerTokenLookup, Token, TokenContract} from "../generated/schema"
import { normalize } from "./helpers";
const zeroAddress = "0x0000000000000000000000000000000000000000"

export function handleURI(event: URI): void {

}

export function handleTransfer(event: Transfer): void {
  let tokenId = event.params.tokenId;
  let id = event.address.toHex() + '_' + tokenId.toString();
  let contractId = event.address.toHex();

  let contract = EIP721AndEIP1155.bind(event.address);
  let tokenContract = TokenContract.load(contractId);
  if(tokenContract == null) {
    tokenContract = new TokenContract(contractId)
    tokenContract.isLikelyERC1155 = false
    let name = contract.try_name();
    if(!name.reverted) {
        tokenContract.name = normalize(name.value);
    }
    let symbol = contract.try_symbol();
    if(!symbol.reverted) {
        tokenContract.symbol = normalize(symbol.value);
    }
    tokenContract.save()
  }

  let token = Token.load(id)
  if(token == null){
    token = new Token(id)
    token.contract = tokenContract.id;
    token.tokenID = tokenId;
    token.mintTime = event.block.timestamp;
    let metadataURI = contract.try_tokenURI(tokenId);
    if(!metadataURI.reverted) {
      token.tokenURI = normalize(metadataURI.value);
    } else {
      let metadataURI = contract.try_uri(tokenId);
      if(!metadataURI.reverted) {
        token.tokenURI = normalize(metadataURI.value);
      } else {
        token.tokenURI = "";
      }
    }
    token.save()
  }

  if(event.params.from!=Address.zero()){
    log.warning("zero address",[])

  let from = Owner.load(event.params.from.toHex())
  if(from==null){
    from = new Owner(event.params.from.toHex())
    from.save()
    }

  }

  if(event.params.to!=Address.zero()){
    let to = Owner.load(event.params.to.toHex())
    if(to==null){
      to = new Owner(event.params.to.toHex())
      to.save()
    }
  }

  handleLookupERC721(contract,event.params.from,event.params.to,token)

}

export function handleTransferSingle(event: TransferSingle): void {
  let tokenId = event.params.id;
  let id = event.address.toHex() + '_' + tokenId.toString();
  let contractId = event.address.toHex();

  let contract = EIP721AndEIP1155.bind(event.address);
  let tokenContract = TokenContract.load(contractId);
  if(tokenContract == null) {
    tokenContract = new TokenContract(contractId)
    tokenContract.isLikelyERC1155 = true
    let name = contract.try_name();
    if(!name.reverted) {
        tokenContract.name = normalize(name.value);
    }
    let symbol = contract.try_symbol();
    if(!symbol.reverted) {
        tokenContract.symbol = normalize(symbol.value);
    }
    tokenContract.save()
  }

  let token = Token.load(id)
  if(token == null){
    token = new Token(id)
    token.contract = tokenContract.id;
    token.tokenID = tokenId;
    token.mintTime = event.block.timestamp;
    let metadataURI = contract.try_tokenURI(tokenId);
    if(!metadataURI.reverted) {
      token.tokenURI = normalize(metadataURI.value);
    } else {
      let metadataURI = contract.try_uri(tokenId);
      if(!metadataURI.reverted) {
        token.tokenURI = normalize(metadataURI.value);
      } else {
        token.tokenURI = "";
      }
    }
    token.save()
  }

  if(event.params.from!=Address.zero()){


    let from = Owner.load(event.params.from.toHex())
    if(from==null){
      from = new Owner(event.params.from.toHex())
      from.save()
      }

  }

  if(event.params.to!=Address.zero()){
    let to = Owner.load(event.params.to.toHex())
    if(to==null){
      to = new Owner(event.params.to.toHex())
      to.save()
    }
  }

  // Value of the transaction (generally null for single transfers, and X for minted.)
  let value = event.params.value|| new BigInt(1);

  handleLookupQuantity(contract,event.params.from,event.params.to,token,value)

}

export function handleTransferBatch(event: TransferBatch): void {

  let contractId = event.address.toHex();
  
  let contract = EIP721AndEIP1155.bind(event.address);
  let tokenContract = TokenContract.load(contractId);
  if(tokenContract == null) {
    tokenContract = new TokenContract(contractId)
    tokenContract.isLikelyERC1155 = true
    let name = contract.try_name();
    if(!name.reverted) {
        tokenContract.name = normalize(name.value);
    }
    let symbol = contract.try_symbol();
    if(!symbol.reverted) {
        tokenContract.symbol = normalize(symbol.value);
    }
    tokenContract.save()
  }

  // Grab the list of IDs in the transaction
  let tokenIds = event.params.ids;
  // Grab the quantities traded for each Ids.
  let values = event.params.values;

  for (let index = 0; index < tokenIds.length; index++) {
    // Token id
    let token_id = tokenIds[index];
    // ID of that collectible for the subgraph
    let id = event.address.toHex() + '_' + token_id.toString();
    // Quantity traded for that collectible
    let q = values[index];

    log.info("index: {}, tokenID: {}, value: {}", [
      index.toString(),
      token_id.toString(),
      q.toString(),
    ]);

    let token = Token.load(id)
    if(token == null){
      token = new Token(id)
      token.contract = tokenContract.id;
      token.tokenID = token_id;
      token.mintTime = event.block.timestamp;
      let metadataURI = contract.try_tokenURI(token_id);
      if(!metadataURI.reverted) {
        token.tokenURI = normalize(metadataURI.value);
      } else {
        let metadataURI = contract.try_uri(token_id);
        if(!metadataURI.reverted) {
          token.tokenURI = normalize(metadataURI.value);
        } else {
          token.tokenURI = "";
        }
      }
      token.save()
    }

      handleLookupQuantity(contract,event.params.from,event.params.to,token,q)

  }

}

function handleLookupERC721(contract:EIP721AndEIP1155,from:Address,to:Address,token:Token):void{

  let wasMinted: boolean = from.toHex() == "0x0000000000000000000000000000000000000000";

  let isBurned: boolean = to.toHex() == "0x0000000000000000000000000000000000000000";

  // If it was minted, the FROM address is the Zero address, therefore we don't create a lookup for it. (it won't work)
  if (wasMinted == false) {
    // I denote look-ups with the id `UserAddress:ContractAddress_tokenId`
    let fromLookupId = from.toHex() + ":" + token.id;

    let ownerTokenAmount = OwnerTokenAmount.load(from.toHex() + ":" + token.contract)
    if (ownerTokenAmount == null) {
      ownerTokenAmount = new OwnerTokenAmount(from.toHex() + ":" + token.contract);
      ownerTokenAmount.owner = from.toHex();
      ownerTokenAmount.contract = token.contract;
      ownerTokenAmount.amount = new BigInt(0);
      ownerTokenAmount.save();
    }
    let tokenAmount = new BigInt(0);
    
    if (ownerTokenAmount.amount.toI64() > 0) {
      tokenAmount = BigInt.fromI64(ownerTokenAmount.amount.toI64() - 1);
      ownerTokenAmount.amount = tokenAmount;
      ownerTokenAmount.save();
    }

    let fromLookup = OwnerTokenLookup.load(fromLookupId);
    if (fromLookup == null) {
      // Lookup doesn't exist so we create a new one.
      fromLookup = new OwnerTokenLookup(fromLookupId);
      fromLookup.owner = from.toHex();
      fromLookup.contract = token.contract;
      fromLookup.token = token.id;
      fromLookup.quantity = BigInt.fromI64(0);
      fromLookup.save();
    } else {
      fromLookup.quantity = BigInt.fromI64(0);
      fromLookup.save();
    }

    log.debug("Getting balance of from: {}", [from.toHex()]);

  }

  // If it was burned, the TO address is the Zero address, therefore we dont'  create a lookup for it. (it won't work)
  if (isBurned == false) {
    // I denote look-ups with the id `UserAddress:contractAddress_tokenId`
    let toLookupId = to.toHex() + ":" + token.id;
    let ownerTokenAmount = OwnerTokenAmount.load(to.toHex() + ":" + token.contract)
    if (ownerTokenAmount == null) {
      ownerTokenAmount = new OwnerTokenAmount(to.toHex() + ":" + token.contract);
      ownerTokenAmount.owner = to.toHex();
      ownerTokenAmount.contract = token.contract;
      ownerTokenAmount.amount = new BigInt(0);
      ownerTokenAmount.save();
    }
    let tokenAmount = new BigInt(0);
    tokenAmount = BigInt.fromI64(ownerTokenAmount.amount.toI64() + 1);
    ownerTokenAmount.amount = tokenAmount;
    ownerTokenAmount.save();
    // to lookup handler
    let toLookup = OwnerTokenLookup.load(toLookupId);
    if (toLookup == null) {
      toLookup = new OwnerTokenLookup(toLookupId);
      toLookup.owner = to.toHex();
      toLookup.contract = token.contract;
      toLookup.token = token.id;
      toLookup.quantity = BigInt.fromI64(1);
      toLookup.save();
    } else {
      toLookup.quantity = BigInt.fromI64(1);
      toLookup.save();
    }
  }
}

function handleLookupQuantity(contract:EIP721AndEIP1155,from:Address,to:Address,token:Token,quantity:BigInt):void{

  let wasMinted: boolean = from.toHex() == "0x0000000000000000000000000000000000000000";

  let isBurned: boolean = to.toHex() == "0x0000000000000000000000000000000000000000";

  // If it was minted, the FROM address is the Zero address, therefore we don't create a lookup for it. (it won't work)
  if (wasMinted == false) {
    // I denote look-ups with the id `UserAddress:ContractAddress_tokenId`
    let fromLookupId = from.toHex() + ":" + token.id;
    let ownerTokenAmount = OwnerTokenAmount.load(from.toHex() + ":" + token.contract)
    if (ownerTokenAmount == null) {
      ownerTokenAmount = new OwnerTokenAmount(from.toHex()  + ":" + token.contract);
      ownerTokenAmount.owner = from.toHex();
      ownerTokenAmount.contract = token.contract;
      ownerTokenAmount.amount = BigInt.fromI32(0);
      ownerTokenAmount.save();
    }
    if (ownerTokenAmount.amount.ge(quantity)) {
      ownerTokenAmount.amount = ownerTokenAmount.amount.minus(quantity);
      ownerTokenAmount.save();
    }
    
    let fromLookup = OwnerTokenLookup.load(fromLookupId);
    if (fromLookup == null) {
      // Lookup doesn't exist so we create a new one.
      fromLookup = new OwnerTokenLookup(fromLookupId);
      fromLookup.owner = from.toHex();
      fromLookup.contract = token.contract;
      fromLookup.token = token.id;
      fromLookup.quantity = BigInt.fromI32(0);
      fromLookup.save();
    }

    log.debug("Getting balance of from: {}", [from.toHex()]);

    // We hit the contract of that collection and ask it how much the FROM user owns.
    let balFrom = contract.try_balanceOf(from, token.tokenID);
    if(balFrom.reverted){
      balFrom = contract.try_balanceOf1(from);
      if(balFrom.reverted){
        balFrom = contract.try_balanceOf2(from);
      }
    }

    if (!balFrom.reverted) {
      // if contract responded, set the quantity FROM user owns.
      fromLookup.quantity = balFrom.value;
    } else if (fromLookup.quantity >= quantity) {
      // if contract badly responded, we attempt to do simple math and remove the quantity sent.
      let amount = fromLookup.quantity.minus(quantity);
      fromLookup.quantity = amount;
    } else {
      // Else if the value sent is greater than previous quantity, we set it to 0.
      fromLookup.quantity = BigInt.fromI32(0);
    }
    fromLookup.save();
  }

  // If it was burned, the TO address is the Zero address, therefore we dont'  create a lookup for it. (it won't work)
  if (isBurned == false) {
    // I denote look-ups with the id `UserAddress:contractAddress_tokenId`
    let toLookupId = to.toHex() + ":" + token.id;
    let ownerTokenAmount = OwnerTokenAmount.load(to.toHex() + ":" + token.contract)
    if (ownerTokenAmount == null) {
      ownerTokenAmount = new OwnerTokenAmount(to.toHex() + ":" + token.contract);
      ownerTokenAmount.owner = to.toHex();
      ownerTokenAmount.contract = token.contract;
      ownerTokenAmount.amount = BigInt.fromI32(0);
      ownerTokenAmount.save();
    }
      let tokenAmount = ownerTokenAmount.amount.plus(quantity);
      ownerTokenAmount.amount = tokenAmount;
      ownerTokenAmount.save();
    // to lookup handler
    let toLookup = OwnerTokenLookup.load(toLookupId);
    if (toLookup == null) {
      toLookup = new OwnerTokenLookup(toLookupId);
      toLookup.owner = to.toHex();
      toLookup.contract = token.contract;
      toLookup.token = token.id;
      toLookup.quantity = BigInt.fromI32(0);
      toLookup.save();
    }

    // This collectible was minted and sent to this user, therefore we know the user now owns the full value.   
    let balTo = contract.try_balanceOf(to, token.tokenID);
    if(balTo.reverted){
      balTo = contract.try_balanceOf1(to);
      if(balTo.reverted){
        balTo = contract.try_balanceOf2(to);
      }
    }
    if (!balTo.reverted) {
      // If replied nicely, we set the quantity that user owns for this collectible.
      toLookup.quantity = balTo.value;
    } else {
      // if contract badly responded, we attempt to do simple math and add the quantity received.
      let amount = toLookup.quantity.plus(quantity);
      toLookup.quantity = amount;
    }
    //Check the quantity is valid:
    // if (toLookup.quantity == null) {
    //   toLookup.quantity = new BigInt(1);
    // }

    toLookup.save();
  }
}