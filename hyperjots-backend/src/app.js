const grpc = require('@grpc/grpc-js');
const { connect, hash, signers } = require('@hyperledger/fabric-gateway');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { TextDecoder } = require('node:util');

const channelName = envOrDefault('CHANNEL_NAME', 'hyperjots');
const chaincodeName = envOrDefault('CHAINCODE_NAME', 'basic');
const mspId = envOrDefault('MSP_ID', 'Org1MSP');

// Path to crypto materials.
const cryptoPath = envOrDefault(
    'CRYPTO_PATH',
    path.resolve(
        __dirname,
        '..',
        '..',
        '..',
        'test-network',
        'organizations',
        'peerOrganizations',
        'org1.example.com'
    )
);

// Path to user private key directory.
const keyDirectoryPath = envOrDefault(
    'KEY_DIRECTORY_PATH',
    path.resolve(
        cryptoPath,
        'users',
        'User1@org1.example.com',
        'msp',
        'keystore'
    )
);

// Path to user certificate directory.
const certDirectoryPath = envOrDefault(
    'CERT_DIRECTORY_PATH',
    path.resolve(
        cryptoPath,
        'users',
        'User1@org1.example.com',
        'msp',
        'signcerts'
    )
);

// Path to peer tls certificate.
const tlsCertPath = envOrDefault(
    'TLS_CERT_PATH',
    path.resolve(cryptoPath, 'peers', 'peer0.org1.example.com', 'tls', 'ca.crt')
);

// Gateway peer endpoint.
const peerEndpoint = envOrDefault('PEER_ENDPOINT', 'localhost:7051');

// Gateway peer SSL host name override.
const peerHostAlias = envOrDefault('PEER_HOST_ALIAS', 'peer0.org1.example.com');

const utf8Decoder = new TextDecoder();
const noteID = `note${String(Date.now())}`;

async function main() {
    displayInputParameters();

    // The gRPC client connection should be shared by all Gateway connections to this endpoint.
    const client = await newGrpcConnection();

    const gateway = connect({
        client,
        identity: await newIdentity(),
        signer: await newSigner(),
        hash: hash.sha256,
        // Default timeouts for different gRPC calls
        evaluateOptions: () => {
            return { deadline: Date.now() + 5000 }; // 5 seconds
        },
        endorseOptions: () => {
            return { deadline: Date.now() + 15000 }; // 15 seconds
        },
        submitOptions: () => {
            return { deadline: Date.now() + 5000 }; // 5 seconds
        },
        commitStatusOptions: () => {
            return { deadline: Date.now() + 60000 }; // 1 minute
        },
    });

    try {
        // Get a network instance representing the channel where the smart contract is deployed.
        const network = gateway.getNetwork(channelName);

        // Get the smart contract from the network.
        const contract = network.getContract(chaincodeName);

        // Initialize the ledger (if needed).
        // await initLedger(contract);

        // Create a new note on the ledger.
        await createNote(contract);

        // Get the note details by noteID.
        await readNoteByID(contract);

        // Update an existing note.
        await updateNoteContent(contract);

        // Return all the current notes on the ledger.
        await getAllNotes(contract);

        // Delete an existing note.
        await deleteNoteByID(contract);
    } finally {
        gateway.close();
        client.close();
    }
}

main().catch((error) => {
    console.error('******** FAILED to run the application:', error);
    process.exitCode = 1;
});

async function newGrpcConnection() {
    const tlsRootCert = await fs.readFile(tlsCertPath);
    const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
    return new grpc.Client(peerEndpoint, tlsCredentials, {
        'grpc.ssl_target_name_override': peerHostAlias,
    });
}

async function newIdentity() {
    const certPath = await getFirstDirFileName(certDirectoryPath);
    const credentials = await fs.readFile(certPath);
    return { mspId, credentials };
}

async function getFirstDirFileName(dirPath) {
    const files = await fs.readdir(dirPath);
    const file = files[0];
    if (!file) {
        throw new Error(`No files in directory: ${dirPath}`);
    }
    return path.join(dirPath, file);
}

async function newSigner() {
    const keyPath = await getFirstDirFileName(keyDirectoryPath);
    const privateKeyPem = await fs.readFile(keyPath);
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    return signers.newPrivateKeySigner(privateKey);
}

// /**
//  * Initialize the ledger with some default notes (if applicable).
//  */
// async function initLedger(contract) {
//     console.log(
//         '\n--> Submit Transaction: InitLedger, function creates the initial set of notes on the ledger'
//     );

//     await contract.submitTransaction('InitLedger');

//     console.log('*** Transaction committed successfully');
// }

/**
 * Get all the notes for the invoking client.
 */
async function getAllNotes(contract) {
    console.log(
        '\n--> Evaluate Transaction: GetAllNotes, function returns all notes belonging to the invoking client.'
    );

    const resultBytes = await contract.evaluateTransaction('GetAllNotes');
    const resultJson = utf8Decoder.decode(resultBytes);
    const result = JSON.parse(resultJson);
    console.log('*** Result:', result);
}

/**
 * Create a new note on the ledger.
 */
async function createNote(contract) {
    console.log(
        '\n--> Submit Transaction: CreateNote, creates a new note with the provided content.'
    );

    const result = await contract.submitTransaction(
        'CreateNote',
        'This is my note content'
    );
    console.log(result);

    console.log('*** Transaction committed successfully');
}

/**
 * Get the details of a note by its noteID.
 */
async function readNoteByID(contract) {
    console.log(
        '\n--> Evaluate Transaction: ReadNote, returns note details for a specific noteID.'
    );

    const resultBytes = await contract.evaluateTransaction('ReadNote', '3');
    const resultJson = utf8Decoder.decode(resultBytes);
    const result = JSON.parse(resultJson);
    console.log('*** Result:', result);
}

/**
 * Update the content of an existing note.
 */
async function updateNoteContent(contract) {
    console.log(
        '\n--> Submit Transaction: UpdateNote, updates the content of an existing note.'
    );

    await contract.submitTransaction(
        'UpdateNote',
        '3',
        'Updated note content for note 3'
    );

    console.log('*** Transaction committed successfully');
}

/**
 * Delete an existing note.
 */
async function deleteNoteByID(contract) {
    console.log(
        '\n--> Submit Transaction: DeleteNote, deletes a note by noteID.'
    );

    await contract.submitTransaction('DeleteNote', '6');

    console.log('*** Transaction committed successfully');
}

/**
 * envOrDefault() will return the value of an environment variable, or a default value if the variable is undefined.
 */
function envOrDefault(key, defaultValue) {
    return process.env[key] || defaultValue;
}

/**
 * displayInputParameters() will print the global scope parameters used by the main driver routine.
 */
function displayInputParameters() {
    console.log(`channelName:       ${channelName}`);
    console.log(`chaincodeName:     ${chaincodeName}`);
    console.log(`mspId:             ${mspId}`);
    console.log(`cryptoPath:        ${cryptoPath}`);
    console.log(`keyDirectoryPath:  ${keyDirectoryPath}`);
    console.log(`certDirectoryPath: ${certDirectoryPath}`);
    console.log(`tlsCertPath:       ${tlsCertPath}`);
    console.log(`peerEndpoint:      ${peerEndpoint}`);
    console.log(`peerHostAlias:     ${peerHostAlias}`);
}
