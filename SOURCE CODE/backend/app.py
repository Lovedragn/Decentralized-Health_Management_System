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
import requests
import serial

app = Flask(__name__)
CORS(app)

# Configuration
CONTRACT_INFO_PATH = os.path.join(os.path.dirname(__file__), "contract_address.json")
PATIENT_DATA_FOLDER = r"C:\Users\sujit\Desktop\fwdblockchaincode\Patient_Data"

# WhatsApp Configuration
WHATSAPP_API_URL = "https://graph.facebook.com/v22.0/1082587534927592/messages"
WHATSAPP_ACCESS_TOKEN = "EAAUFwIlkregBQyQtPGrFJblABVpBMoJ5oh0kMoyUq1oKiWOzNi0Fd4EvAZCDRE9lDWTWUoOxStsers54luc2i9PdbkZC9YBRWNzZCgkmuUdUPq10M68CwDkHWQozrrsO3sxr42HXVEC1DGPmQaHcnbuRurxDGK2xU3qeobM9ovlTpI79YiHlA0GQVQqyYxBJv31rWcZBt9A8WtWQhwzdJGcf7Dcc16VUl5ZCF"
WHATSAPP_PHONE_NUMBER_ID = "1082587534927592"
PATIENT_PHONE_NUMBERS = {
    "patient001": "+918248157168",
}

# Global variables for blockchain connection
w3 = None
contract = None
selected_account = None

# Arduino serial configuration
try:
    arduino = serial.Serial('COM5', 9600, timeout=2)
    time.sleep(2)
    print("Arduino connected")
except Exception as e:
    arduino = None
    print("Arduino error:", e)

def send_whatsapp_message(patient_id, temperature, status, user_phone):
    """Send WhatsApp message to patient about abnormal temperature using template"""
    try:
        # Use user's phone number from profile menu
        patient_phone = user_phone
        
        if not patient_phone:
            print(f"No phone number provided")
            return False
        
        # Use template message for health alerts
        payload = {
            "messaging_product": "whatsapp",
            "to": patient_phone,
            "type": "template",
            "template": {
                "name": "health_care",  # You need to create this template in WhatsApp Business
                "language": {
                    "code": "en_US"
                },
                "components": [
                    {
                        "type": "body",
                        "parameters": [
                            {
                                "type": "text",
                                "text": str(temperature)
                            },
                            {
                                "type": "text", 
                                "text": "high" if status == "high" else "low"
                            }
                        ]
                    }
                ]
            }
        }
        
        # Headers for WhatsApp API
        headers = {
            "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}",
            "Content-Type": "application/json"
        }
        
        # Send WhatsApp message
        response = requests.post(WHATSAPP_API_URL, json=payload, headers=headers)
        
        if response.status_code == 200:
            print(f"WhatsApp template message sent successfully to {patient_id} at {patient_phone}")
            print(f"Response: {response.json()}")
            return True
        else:
            print(f"Failed to send WhatsApp message: {response.status_code} - {response.text}")
            
            # Try fallback text message (only works if user messaged us first)
            try:
                text_payload = {
                    "messaging_product": "whatsapp",
                    "to": patient_phone,
                    "type": "text",
                    "text": {
                        "body": f"🚨 HEALTH ALERT: Your temperature ({temperature}°C) is {'above' if status == 'high' else 'below'} normal range. Please seek medical attention."
                    }
                }
                
                text_response = requests.post(WHATSAPP_API_URL, json=text_payload, headers=headers)
                if text_response.status_code == 200:
                    print(f"WhatsApp text message sent successfully to {patient_id}")
                    return True
                else:
                    print(f"Text message also failed: {text_response.status_code} - {text_response.text}")
            except Exception as e:
                print(f"Text message fallback error: {str(e)}")
            
            return False
            
    except Exception as e:
        print(f"Error sending WhatsApp message: {str(e)}")
        return False

def check_temperature_and_alert(patient_id, temperature, user_phone):
    """Check temperature and send WhatsApp alert if abnormal"""
    try:
        # Normal temperature range in Celsius
        NORMAL_MIN_TEMP = 36.0
        NORMAL_MAX_TEMP = 37.8
        
        if temperature > NORMAL_MAX_TEMP:
            # High temperature alert
            send_whatsapp_message(patient_id, temperature, "high", user_phone)
            return "high"
        elif temperature < NORMAL_MIN_TEMP:
            # Low temperature alert
            send_whatsapp_message(patient_id, temperature, "low", user_phone)
            return "low"
        else:
            # Normal temperature
            return "normal"
            
    except Exception as e:
        print(f"Error checking temperature: {str(e)}")
        return "error"

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
    try:
        data = request.get_json()
        patient_id = data.get('patient_id', 'patient001')
        user_phone = data.get('user_phone', '+918248157168')

        if not os.path.exists(PATIENT_DATA_FOLDER):
            return jsonify({"error": "Patient data folder not found"}), 400
        print("Good")

        # 🔥 Trigger Arduino
        arduino.write(b'START\n')

        result = ""
        start_time = time.time()
        # 🔥 Wait for Arduino response
        while time.time() - start_time < 15:
            if arduino.in_waiting:
                result = arduino.readline().decode().strip()
                if result.startswith("RESULT:"):
                    break

        if not result:
            return jsonify({"error": "No data received from Arduino"}), 500

        # 🔥 Parse result
        try:
            temp,bpm,spo2, = result.replace("RESULT:", "").split(",")
            temp = float(temp)
        except:
            temp,bpm,spo2 = 37.3, 84, 98

        # 🔥 Save file
        filename = f"{patient_id}_{int(time.time())}.txt"
        file_path = os.path.join(PATIENT_DATA_FOLDER, filename)

        with open(file_path, "w") as f:
            f.write(f"Temp: {temp}\nSpO2: {spo2}\nBPM: {bpm}")

        # 🔥 Prepare temperature data
        temperature_data = {
            "value": round(temp, 1),
            "source": filename,
            "raw_content": result
        }

        # 🔥 WhatsApp check
        temp_status = check_temperature_and_alert(patient_id, temp, user_phone)

        # 🔥 Blockchain upload
        upload_results = []
        try:
            initialize_blockchain()
            patient_hash = keccak(text=patient_id)

            with open(file_path, 'rb') as f:
                file_data = f.read()

            file_hash = hashlib.sha256(file_data).hexdigest()

            contract.functions.uploadRecord(
                patient_hash,
                bytes.fromhex(file_hash),
                filename
            ).transact({'from': selected_account})

            upload_results.append({
                "filename": filename,
                "status": "success"
            })

        except Exception as e:
            upload_results.append({
                "filename": filename,
                "status": "error",
                "message": str(e)
            })

        return jsonify({
            "status": "success",
            "message": "Data collected successfully",
            "temperature": {
                "value": temperature_data["value"],
                "unit": "°C",
                "status": temp_status,
                "alert_sent": temp_status != "normal"
            },
            "data": {
                "temp": temp,
                "spo2": spo2,
                "bpm": bpm
            },
            "upload_results": upload_results
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/query-records', methods=['POST'])
def query_records():
    """Query patient records from blockchain"""
    try:
        # Validate patient data folder exists
        if not os.path.exists(PATIENT_DATA_FOLDER):
            return jsonify({"error": f"Patient data folder not found: {PATIENT_DATA_FOLDER}"}), 500
        
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        patient_id = data.get('patient_id', 'patient001')
        
        if not patient_id or not isinstance(patient_id, str):
            return jsonify({"error": "Invalid patient_id"}), 400
        
        # Initialize blockchain if not already done
        try:
            initialize_blockchain()
        except Exception as e:
            return jsonify({"error": f"Blockchain initialization failed: {str(e)}"}), 500
        
        # Compute patient hash
        try:
            patient_hash = keccak(text=patient_id)
        except Exception as e:
            return jsonify({"error": f"Failed to compute patient hash: {str(e)}"}), 400
        
        # Get record count
        try:
            count = contract.functions.getRecordCount(patient_hash).call()
        except Exception as e:
            return jsonify({"error": f"Failed to get record count: {str(e)}"}), 500
        
        records = []
        
        for i in range(count):
            try:
                record = contract.functions.getRecord(patient_hash, i).call()
                file_hash_onchain = record[0]
                timestamp = record[1]
                uploader = record[2]
                metadata = record[3]
            except Exception as e:
                print(f"Error retrieving record {i}: {str(e)}")
                continue
            
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
    app.run(debug=True, host='0.0.0.0', port=5000,use_reloader=False)
