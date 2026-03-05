// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title Health Records Hash Registry
/// @notice Stores immutable file hash records and minimal metadata. Does NOT store file contents.
contract HealthRecords {

    struct Record {
        bytes32 fileHash;     // SHA-256 (stored as bytes32)
        uint256 timestamp;
        address uploader;
        string metadata;      // optional: IPFS pointer or JSON metadata (encrypted)
    }

    // patientIdHash => recordId => Record
    mapping(bytes32 => Record[]) private records;

    // Access events
    event RecordUploaded(bytes32 indexed patientIdHash, uint256 indexed recordIndex, bytes32 fileHash, address indexed uploader, uint256 timestamp, string metadata);

    /// @notice Upload a record for a patient (patientIdHash is hashed off-chain)
    /// @param patientIdHash hashed patient identifier (bytes32)
    /// @param fileHash sha256(file) as bytes32
    /// @param metadata optional metadata or pointer (e.g., IPFS CID or encrypted metadata)
    function uploadRecord(bytes32 patientIdHash, bytes32 fileHash, string calldata metadata) external {
        Record memory r = Record({
            fileHash: fileHash,
            timestamp: block.timestamp,
            uploader: msg.sender,
            metadata: metadata
        });
        records[patientIdHash].push(r);
        uint256 idx = records[patientIdHash].length - 1;
        emit RecordUploaded(patientIdHash, idx, fileHash, msg.sender, r.timestamp, metadata);
    }

    /// @notice Get number of records for a patient
    function getRecordCount(bytes32 patientIdHash) external view returns (uint256) {
        return records[patientIdHash].length;
    }

    /// @notice Get a record by patient and index
    function getRecord(bytes32 patientIdHash, uint256 index) external view returns (bytes32 fileHash, uint256 timestamp, address uploader, string memory metadata) {
        require(index < records[patientIdHash].length, "index OOB");
        Record storage r = records[patientIdHash][index];
        return (r.fileHash, r.timestamp, r.uploader, r.metadata);
    }
}
