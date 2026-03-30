# Quick run (local dev, Ganache)

1. Start Ganache (GUI or CLI) on http://127.0.0.1:7545.

2. Install Python dependencies (use Python 3.9.0)
   cd backend
   pip install -r requirements.txt

3. Deploy contract
   python deploy_contract.py
   -> creates backend/contract_address.json

4. Run Streamlit app
   cd ../app
   streamlit run streamlit_app.py

5. In Streamlit:
   - Choose Ganache account from sidebar (account[0] by default)
   - Upload a file or use local file `/mnt/data/Decentralized Health Data Management.docx`
   - Click "Register hash on blockchain" to store the file SHA-256 on-chain
   - Query records using the same patient ID to list entries and verify hashes.

Notes:
- Only hashes (bytes32) are stored on-chain. For privacy, store encrypted files off-chain (IPFS or encrypted DB) and write the pointer into the `metadata` argument.
- For production NEVER use Ganache; deploy to testnet/mainnet with a proper wallet/signing flow and consider gas costs.
