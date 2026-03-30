# deploy_contract.py
# deploy_contract.py
import json
from solcx import compile_standard, install_solc
from web3 import Web3
import os

GANACHE_URL = "http://127.0.0.1:7545"
SOLC_VERSION = "0.8.19"
CONTRACT_FILE = "../contracts/HealthRecords.sol"

def compile_contract():
    install_solc(SOLC_VERSION)
    with open(os.path.join(os.path.dirname(__file__), CONTRACT_FILE), 'r') as f:
        source = f.read()

    compiled = compile_standard({
        "language": "Solidity",
        "sources": {
            "HealthRecords.sol": {"content": source}
        },
        "settings": {
            "outputSelection": {
                "*": {
                    "*": ["abi", "metadata", "evm.bytecode", "evm.sourceMap"]
                }
            }
        }
    }, solc_version=SOLC_VERSION)

    contract_data = compiled['contracts']['HealthRecords.sol']['HealthRecords']
    abi = contract_data['abi']
    bytecode = contract_data['evm']['bytecode']['object']
    return abi, bytecode

def deploy():
    abi, bytecode = compile_contract()
    w3 = Web3(Web3.HTTPProvider(GANACHE_URL))

    # FIX HERE 👇
    if not w3.is_connected():
        raise SystemExit(f"Unable to connect to Ganache at {GANACHE_URL}. Start Ganache and retry.")

    acct = w3.eth.accounts[0]
    w3.eth.default_account = acct

    HealthRecords = w3.eth.contract(abi=abi, bytecode=bytecode)

    tx_hash = HealthRecords.constructor().transact()
    tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    address = tx_receipt.contractAddress

    info = {
        "address": address,
        "abi": abi,
        "deployer": acct,
        "rpc": GANACHE_URL
    }
    out_path = os.path.join(os.path.dirname(__file__), "contract_address.json")
    with open(out_path, "w") as f:
        json.dump(info, f, indent=2)

    print("Contract deployed at:", address)
    print("Saved contract info to", out_path)

if __name__ == "__main__":
    deploy()
