# streamlit_app.py
import streamlit as st
import hashlib
import json
import os
from web3 import Web3
from eth_utils import keccak, to_hex
import mimetypes
import base64
from datetime import datetime
import time

# Custom CSS for professional styling
st.markdown("""
<style>
.stButton>button {
    background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 6px;
    font-weight: 500;
    transition: all 0.2s ease;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.stButton>button:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}

.stTextInput>div>div>input {
    border-radius: 6px;
    border: 1px solid #d1d5db;
    padding: 8px 12px;
    transition: border-color 0.2s ease;
}

.stTextInput>div>div>input:focus {
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.stHeader {
    color: #1f2937;
    font-weight: 600;
}

.card {
    background: #ffffff;
    border-radius: 8px;
    padding: 24px;
    margin: 8px 0;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06);
    border: 1px solid #e5e7eb;
}
.output-card {
    max-height: 70vh;
    overflow-y: auto;
    overflow-x: hidden;
}
.stSuccess, .stError, .stWarning, .stInfo {
    border-radius: 6px;
    border: none;
}
</style>
""", unsafe_allow_html=True)

# Initialize session state for outputs
if "upload_output" not in st.session_state:
    st.session_state.upload_output = []
if "query_output" not in st.session_state:
    st.session_state.query_output = []
if "current_view" not in st.session_state:
    st.session_state.current_view = "welcome"


# -----------------------------
# UPLOAD HANDLER
# -----------------------------
def upload_files_from_folder(w3, contract, account, patient_id, folder_path):
    output_messages = []
    
    if not os.path.exists(folder_path):
        output_messages.append(("error", "Patient_Data folder not found."))
        st.session_state.upload_output = output_messages
        st.session_state.current_view = "upload"
        return
    
    files = [f for f in os.listdir(folder_path) if os.path.isfile(os.path.join(folder_path, f))]
    if not files:
        output_messages.append(("warning", "No files found in the folder."))
        st.session_state.upload_output = output_messages
        st.session_state.current_view = "upload"
        return
    
    patient_hash = keccak(text=patient_id)
    
    status_text = st.empty()
    
    for idx, filename in enumerate(files):
        file_path = os.path.join(folder_path, filename)
        try:
            status_text.text(f"Processing {filename}...")
            with open(file_path, 'rb') as f:
                file_bytes = f.read()
            file_hash = hashlib.sha256(file_bytes).hexdigest()
            file_hash_bytes32 = bytes.fromhex(file_hash)[:32]
            metadata = filename
            
            tx = contract.functions.uploadRecord(
                patient_hash,
                file_hash_bytes32,
                metadata
            ).transact({'from': account})
            w3.eth.wait_for_transaction_receipt(tx)
            
            output_messages.append(("success", f"Uploaded: {filename}"))
            
        except Exception as e:
            output_messages.append(("error", f"Error uploading {filename}: {e}"))
    
    status_text.empty()
    output_messages.append(("success", "All files uploaded successfully."))
    st.session_state.upload_output = output_messages
    st.session_state.current_view = "upload"


# Removed auto-upload watcher


# Load contract info
CONTRACT_INFO_PATH = os.path.join(os.path.dirname(__file__), "../backend/contract_address.json")

st.set_page_config(page_title="Decentralized Health Management System", layout="wide")

# Main title
st.markdown('<div class="fade-in">', unsafe_allow_html=True)
st.title("Decentralized Health Management System")
st.caption("Secure blockchain-based file integrity verification system")
st.markdown('</div>', unsafe_allow_html=True)

st.info("Upload files from: C:\\Users\\sujit\\Desktop\\fwdblockchaincode\\Patient_Data by specifying patient ID")


if not os.path.exists(CONTRACT_INFO_PATH):
    st.error("contract_address.json not found. Deploy the contract first with backend/deploy_contract.py")
    st.stop()

with open(CONTRACT_INFO_PATH, "r") as f:
    info = json.load(f)

RPC = info.get("rpc")
CONTRACT_ADDRESS = info.get("address")
ABI = info.get("abi")

w3 = Web3(Web3.HTTPProvider(RPC))

if not w3.is_connected():
    st.error(f"Unable to connect to Ethereum node at {RPC}. Start Ganache.")
    st.stop()

contract = w3.eth.contract(
    address=Web3.to_checksum_address(CONTRACT_ADDRESS),
    abi=ABI
)

# Account setup - using first account automatically
accounts = w3.eth.accounts
if not accounts:
    st.error("No Ganache accounts found.")
    st.stop()

# Use the first account for all transactions
selected_acct = accounts[0]
w3.eth.default_account = selected_acct

folder_path = r"C:\Users\sujit\Desktop\fwdblockchaincode\Patient_Data"

# Main layout: Left side for inputs, Right side for outputs
main_col1, main_col2 = st.columns([1, 1.2])

# Left Column: Input Forms
with main_col1:
    st.header("Patient Data Collection")
    upload_patient_id = st.text_input("Patient ID", value="patient001", help="Enter the patient identifier for file association")
    
    if st.button("Verify Patient", help="Start sensor data collection and automatic blockchain upload"):
        # Get current files before collection
        if not os.path.exists(folder_path):
            st.error(f"Patient data folder not found: {folder_path}")
            st.stop()
        
        current_files = set(os.listdir(folder_path))
        
        # Simulate 15-second sensor data collection
        progress_bar = st.progress(0)
        status_text = st.empty()
        
        for i in range(16):  # 0 to 15 seconds
            progress_bar.progress(i / 15)
            status_text.text(f"Collecting sensor data... {15-i} seconds remaining")
            time.sleep(1)
        
        progress_bar.empty()
        status_text.empty()
        
        # Check for new files after collection
        new_files = set(os.listdir(folder_path)) - current_files
        
        if new_files:
            st.success(f"Data collection complete! Found {len(new_files)} new file(s). Uploading to blockchain...")
            
            # Upload only the new files
            upload_output = []
            p_hash = keccak(text=upload_patient_id)
            
            for filename in new_files:
                file_path = os.path.join(folder_path, filename)
                if os.path.isfile(file_path):
                    try:
                        with open(file_path, 'rb') as f:
                            file_data = f.read()
                        
                        file_hash = hashlib.sha256(file_data).hexdigest()
                        
                        # Store on blockchain
                        tx_hash = contract.functions.uploadRecord(
                            p_hash,
                            bytes.fromhex(file_hash),
                            filename
                        ).transact({'from': selected_acct})
                        
                        upload_output.append(("success", f"Uploaded {filename} to blockchain for patient {upload_patient_id}"))
                        
                    except Exception as e:
                        upload_output.append(("error", f"Failed to upload {filename}: {str(e)}"))
            
            st.session_state.upload_output = upload_output
            st.session_state.current_view = "upload"
        else:
            st.session_state.upload_output = [("warning", "No new patient data files were created during the collection period.")]
            st.session_state.current_view = "upload"
    
    st.header("Record Query")
    query_patient = st.text_input("Patient ID", value="patient001", key="q1", help="Enter patient ID to retrieve associated records")
    
    if st.button("Query Records", help="Retrieve blockchain records for specified patient"):
        with st.spinner("Retrieving records..."):
            p_hash = keccak(text=query_patient)
            query_results = []

            try:
                cnt = contract.functions.getRecordCount(p_hash).call()
                query_results.append(("success", f"Found {cnt} record(s) for patient {query_patient}"))

                # Collect all records first
                records_list = []
                for i in range(cnt):
                    rec = contract.functions.getRecord(p_hash, i).call()
                    fileHash_onchain = rec[0]
                    timestamp = rec[1]
                    uploader = rec[2]
                    meta = rec[3]

                    file_hash_hex = to_hex(fileHash_onchain)[2:]

                    record_info = {
                        "index": i,
                        "hash": to_hex(fileHash_onchain),
                        "timestamp": timestamp,
                        "readable_timestamp": datetime.fromtimestamp(timestamp).strftime("%Y-%m-%d %H:%M:%S"),
                        "filename": meta,
                        "file_data": None
                    }

                    # Try to load file content
                    if meta:
                        file_path_in_folder = os.path.join(folder_path, meta)
                        if os.path.exists(file_path_in_folder):
                            try:
                                with open(file_path_in_folder, 'rb') as f:
                                    file_bytes = f.read()
                                record_info["file_data"] = file_bytes
                                record_info["file_path"] = file_path_in_folder
                            except Exception as e:
                                record_info["file_error"] = str(e)

                    records_list.append(record_info)

                # Sort records by record number in descending order (latest first)
                records_list.sort(key=lambda x: x["index"], reverse=True)

                # Add sorted records to query results
                for record_info in records_list:
                    query_results.append(("record", record_info))

                st.session_state.query_output = query_results
                st.session_state.current_view = "query"

            except Exception as e:
                st.session_state.query_output = [("error", f"Error retrieving records: {e}")]
                st.session_state.current_view = "query"
    st.markdown('</div>', unsafe_allow_html=True)

# Right Column: Output Display
with main_col2:
    st.header("Output Console")
    
    # Display outputs based on current view
    if st.session_state.current_view == "upload" and st.session_state.upload_output:
        for msg_type, message in st.session_state.upload_output:
            if msg_type == "success":
                st.success(message)
            elif msg_type == "error":
                st.error(message)
            elif msg_type == "warning":
                st.warning(message)
    
    elif st.session_state.current_view == "query" and st.session_state.query_output:
        for item_type, content in st.session_state.query_output:
            if item_type == "success":
                st.success(content)
            elif item_type == "error":
                st.error(content)
            elif item_type == "record":
                record = content
                with st.container():
                    st.markdown(f"**Record {record['index']}** — Hash: `{record['hash']}`")
                    st.write(f"Timestamp: {record['readable_timestamp']} | Filename: {record['filename']}")
                    
                    if record['filename']:
                        st.caption(f"File: {record['filename']}")
                        
                        if record.get('file_data'):
                            # Determine file type and display accordingly
                            mime_type, _ = mimetypes.guess_type(record.get('file_path', ''))
                            if mime_type and mime_type.startswith("image/"):
                                st.image(record['file_data'], caption=record['filename'], key=f"output_image_{record['index']}")
                            elif mime_type == "application/pdf":
                                b64_pdf = base64.b64encode(record['file_data']).decode("utf-8")
                                pdf_viewer = f'<iframe src="data:application/pdf;base64,{b64_pdf}" width="100%" height="600"></iframe>'
                                st.markdown(pdf_viewer, unsafe_allow_html=True)
                            elif mime_type and mime_type.startswith("text/"):
                                st.text_area("File Content:", record['file_data'].decode("utf-8"), height=300, key=f"output_text_{record['index']}")
                            else:
                                st.download_button("Download File", data=record['file_data'], file_name=record['filename'], key=f"output_download_{record['index']}")
                        elif record.get('file_error'):
                            st.error(f"Error reading file {record['filename']}: {record['file_error']}")
                        else:
                            st.warning("File not found in folder.")
                    else:
                        st.caption("No file metadata available.")
    
    
    
    st.markdown('</div>', unsafe_allow_html=True)

