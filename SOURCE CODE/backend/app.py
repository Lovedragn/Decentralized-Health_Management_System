from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import json
import os
import hashlib
import time
import mimetypes
import base64
from datetime import datetime
from web3 import Web3
from eth_utils import keccak, to_hex

app = Flask(__name__)
CORS(app)

# Configuration
CONTRACT_INFO_PATH = os.path.join(os.path.dirname(__file__), "contract_address.json")
PATIENT_DATA_FOLDER = r"C:\Users\sujit\Desktop\fwdblockchaincode\Patient_Data"

# Global variables for blockchain connection
w3 = None
contract = None
selected_account = None

def initialize_blockchain():
    """Initialize blockchain connection"""
    global w3, contract, selected_account
    
    if not os.path.exists(CONTRACT_INFO_PATH):
        raise Exception("Contract info not found. Deploy contract first.")
    
    with open(CONTRACT_INFO_PATH, "r") as f:
        info = json.load(f)
    
    RPC = info.get("rpc")
    CONTRACT_ADDRESS = info.get("address")
    ABI = info.get("abi")
    
    w3 = Web3(Web3.HTTPProvider(RPC))
    
    if not w3.is_connected():
        raise Exception(f"Unable to connect to Ethereum node at {RPC}")
    
    contract = w3.eth.contract(
        address=Web3.to_checksum_address(CONTRACT_ADDRESS),
        abi=ABI
    )
    
    accounts = w3.eth.accounts
    if not accounts:
        raise Exception("No accounts found")
    
    selected_account = accounts[0]
    w3.eth.default_account = selected_account

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "timestamp": datetime.now().isoformat()})

@app.route('/api/collect-data', methods=['POST'])
def collect_patient_data():
    """Simulate sensor data collection"""
    try:
        data = request.get_json()
        patient_id = data.get('patient_id')
        
        if not os.path.exists(PATIENT_DATA_FOLDER):
            return jsonify({"error": "Patient data folder not found"}), 400
        
        # Get current files before collection
        current_files = set(os.listdir(PATIENT_DATA_FOLDER))
        
        
        # Check for new files
        new_files = set(os.listdir(PATIENT_DATA_FOLDER)) - current_files
        
        if new_files:
            # Initialize blockchain if not already done
            initialize_blockchain()
            
            upload_results = []
            patient_hash = keccak(text=patient_id)
            
            for filename in new_files:
                file_path = os.path.join(PATIENT_DATA_FOLDER, filename)
                if os.path.isfile(file_path):
                    try:
                        with open(file_path, 'rb') as f:
                            file_data = f.read()
                        
                        file_hash = hashlib.sha256(file_data).hexdigest()
                        
                        # Store on blockchain
                        tx_hash = contract.functions.uploadRecord(
                            patient_hash,
                            bytes.fromhex(file_hash),
                            filename
                        ).transact({'from': selected_account})
                        
                        upload_results.append({
                            "filename": filename,
                            "status": "success",
                            "message": f"Uploaded {filename} to blockchain"
                        })
                        
                    except Exception as e:
                        upload_results.append({
                            "filename": filename,
                            "status": "error",
                            "message": f"Failed to upload {filename}: {str(e)}"
                        })
            
            return jsonify({
                "status": "success",
                "message": f"Data collection complete! Found {len(new_files)} new file(s)",
                "upload_results": upload_results
            })
        else:
            return jsonify({
                "status": "warning",
                "message": "No new patient data files were created during collection"
            })
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/query-records', methods=['POST'])
def query_records():
    """Query patient records from blockchain"""
    try:
        data = request.get_json()
        patient_id = data.get('patient_id', 'patient001')
        
        # Initialize blockchain if not already done
        initialize_blockchain()
        
        patient_hash = keccak(text=patient_id)
        
        # Get record count
        count = contract.functions.getRecordCount(patient_hash).call()
        
        records = []
        
        for i in range(count):
            record = contract.functions.getRecord(patient_hash, i).call()
            file_hash_onchain = record[0]
            timestamp = record[1]
            uploader = record[2]
            metadata = record[3]
            
            record_info = {
                "index": i,
                "hash": to_hex(file_hash_onchain),
                "timestamp": timestamp,
                "readable_timestamp": datetime.fromtimestamp(timestamp).strftime("%Y-%m-%d %H:%M:%S"),
                "filename": metadata,
                "uploader": uploader
            }
            
            # Try to load file content
            if metadata:
                file_path = os.path.join(PATIENT_DATA_FOLDER, metadata)
                if os.path.exists(file_path):
                    try:
                        with open(file_path, 'rb') as f:
                            file_bytes = f.read()
                        
                        # Get file info
                        mime_type, _ = mimetypes.guess_type(file_path)
                        
                        # Prepare file data for transmission
                        file_data = None
                        if mime_type and mime_type.startswith("image/"):
                            # Convert image to base64
                            file_data = base64.b64encode(file_bytes).decode('utf-8')
                        elif mime_type == "application/pdf":
                            # Convert PDF to base64
                            file_data = base64.b64encode(file_bytes).decode('utf-8')
                        elif mime_type and mime_type.startswith("text/"):
                            # Convert text to string
                            file_data = file_bytes.decode('utf-8', errors='ignore')
                        
                        record_info.update({
                            "file_data": file_data,
                            "mime_type": mime_type,
                            "file_size": len(file_bytes),
                            "file_available": True
                        })
                        
                    except Exception as e:
                        record_info["file_error"] = str(e)
                        record_info["file_available"] = False
                else:
                    record_info["file_available"] = False
            
            records.append(record_info)
        
        # Sort records by index descending (latest first)
        records.sort(key=lambda x: x["index"], reverse=True)
        
        return jsonify({
            "status": "success",
            "patient_id": patient_id,
            "record_count": count,
            "records": records
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/download-file/<filename>', methods=['GET'])
def download_file(filename):
    """Download a specific file"""
    try:
        file_path = os.path.join(PATIENT_DATA_FOLDER, filename)
        
        if not os.path.exists(file_path):
            return jsonify({"error": "File not found"}), 404
        
        return send_file(file_path, as_attachment=True, download_name=filename)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/blockchain-status', methods=['GET'])
def blockchain_status():
    """Get blockchain connection status"""
    try:
        initialize_blockchain()
        
        return jsonify({
            "status": "connected",
            "rpc": w3.provider.endpoint_uri,
            "contract_address": contract.address,
            "account": selected_account,
            "block_number": w3.eth.block_number
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
