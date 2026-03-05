# streamlit_app.py
import streamlit as st
import hashlib
import json
import os
from web3 import Web3
from eth_utils import keccak, to_hex
import mimetypes
import base64

# -----------------------------
# SESSION MEMORY FOR FILES
# -----------------------------
# Removed manual file upload and session memory


# -----------------------------
# UPLOAD HANDLER
# -----------------------------
def upload_files_from_folder(w3, contract, account, patient_id, folder_path):
    if not os.path.exists(folder_path):
        st.error("Patient_Data folder not found.")
        return
    
    files = [f for f in os.listdir(folder_path) if os.path.isfile(os.path.join(folder_path, f))]
    if not files:
        st.warning("No files found in the folder.")
        return
    
    patient_hash = keccak(text=patient_id)
    
    for filename in files:
        file_path = os.path.join(folder_path, filename)
        try:
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
            st.success(f"Uploaded: {filename}")
        except Exception as e:
            st.error(f"Error uploading {filename}: {e}")


# Removed auto-upload watcher


# Load contract info
CONTRACT_INFO_PATH = os.path.join(os.path.dirname(__file__), "../backend/contract_address.json")

st.set_page_config(page_title="Decentralized File Verifier", layout="centered")

st.title("Decentralized File Verifier (Ganache + Ethereum + Streamlit)")
st.caption("Stores SHA-256 hash on-chain. Upload files from the Patient_Data folder.")
st.info("Upload files from folder: C:\\Users\\sujit\\Desktop\\fwdblockchaincode\\Patient_Data by entering patient ID and clicking upload.")


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

# Sidebar: account selection
st.sidebar.header("Ganache Account")
accounts = w3.eth.accounts
if not accounts:
    st.error("No Ganache accounts found.")
    st.stop()

selected_acct = st.sidebar.selectbox("Use account", accounts, index=0)
w3.eth.default_account = selected_acct

# Upload files from folder
st.header("Upload files from folder")

upload_patient_id = st.text_input("Patient ID for upload", value="patient001")

folder_path = r"C:\Users\sujit\Desktop\fwdblockchaincode\Patient_Data"

if st.button("Scan and upload files"):
    upload_files_from_folder(w3, contract, selected_acct, upload_patient_id, folder_path)


# -----------------------------
# QUERY RECORDS SECTION
# -----------------------------
st.markdown("---")
st.header("Query records for patient")

query_patient = st.text_input("Enter patient ID to query", value="patient001", key="q1")

if st.button("Get records"):
    p_hash = keccak(text=query_patient)

    try:
        cnt = contract.functions.getRecordCount(p_hash).call()
        st.write(f"Record count: {cnt}")

        for i in range(cnt):
            rec = contract.functions.getRecord(p_hash, i).call()
            fileHash_onchain = rec[0]
            timestamp = rec[1]
            uploader = rec[2]
            meta = rec[3]

            file_hash_hex = to_hex(fileHash_onchain)[2:]  # remove 0x

            st.write(
                f"Index {i} — fileHash: {to_hex(fileHash_onchain)}, "
                f"timestamp: {timestamp}, uploader: {uploader}, metadata: {meta}"
            )

            # Show uploaded file name from metadata
            if meta:
                st.caption(f"Uploaded file: {meta}")
                # Try to show file content from folder
                file_path_in_folder = os.path.join(folder_path, meta)
                if os.path.exists(file_path_in_folder):
                    try:
                        with open(file_path_in_folder, 'rb') as f:
                            file_bytes = f.read()
                        # Determine file type and display accordingly
                        mime_type, _ = mimetypes.guess_type(file_path_in_folder)
                        if mime_type and mime_type.startswith("image/"):
                            st.image(file_bytes, caption=meta, key=f"image_{i}")
                        elif mime_type == "application/pdf":
                            b64_pdf = base64.b64encode(file_bytes).decode("utf-8")
                            pdf_viewer = f'<iframe src="data:application/pdf;base64,{b64_pdf}" width="100%" height="600"></iframe>'
                            st.markdown(pdf_viewer, unsafe_allow_html=True)
                        elif mime_type and mime_type.startswith("text/"):
                            st.text_area("File Content:", file_bytes.decode("utf-8"), height=300, key=f"text_area_{i}")
                        else:
                            st.download_button("Download File", data=file_bytes, file_name=meta, key=f"download_{i}")
                    except Exception as e:
                        st.error(f"Error reading file {meta}: {e}")
                else:
                    st.warning("File not found in folder.")
            else:
                st.caption("No file metadata available.")

    except Exception as e:
        st.error("Error while fetching records: " + str(e))


st.markdown("---")
st.info("Upload files from the Patient_Data folder. Blockchain stores only the hash.")
