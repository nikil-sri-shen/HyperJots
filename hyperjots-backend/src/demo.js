const grpc = require('@grpc/grpc-js');
const { connect, hash, signers } = require('@hyperledger/fabric-gateway');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { TextDecoder } = require('node:util');
const readline = require('readline');

const channelName = 'hyperjots';
const chaincodeName = 'basic';

// Paths to crypto materials for Org1 and Org2
const orgPaths = {
    org1: {
        cryptoPath: path.resolve(
            __dirname,
            '..',
            '..',
            '..',
            'test-network',
            'organizations',
            'peerOrganizations',
            'org1.example.com'
        ),
        keyPath: path.resolve(
            __dirname,
            '..',
            '..',
            '..',
            'test-network',
            'organizations',
            'peerOrganizations',
            'org1.example.com',
            'users',
            'User1@org1.example.com',
            'msp',
            'keystore'
        ),
        certPath: path.resolve(
            __dirname,
            '..',
            '..',
            '..',
            'test-network',
            'organizations',
            'peerOrganizations',
            'org1.example.com',
            'users',
            'User1@org1.example.com',
            'msp',
            'signcerts'
        ),
        peerEndpoint: 'localhost:7051',
        peerHostAlias: 'peer0.org1.example.com',
        mspId: 'Org1MSP',
        tlsCertPath: path.resolve(
            __dirname,
            '..',
            '..',
            '..',
            'test-network',
            'organizations',
            'peerOrganizations',
            'org1.example.com',
            'peers',
            'peer0.org1.example.com',
            'tls',
            'ca.crt'
        ),
    },
    org2: {
        cryptoPath: path.resolve(
            __dirname,
            '..',
            '..',
            '..',
            'test-network',
            'organizations',
            'peerOrganizations',
            'org2.example.com'
        ),
        keyPath: path.resolve(
            __dirname,
            '..',
            '..',
            '..',
            'test-network',
            'organizations',
            'peerOrganizations',
            'org2.example.com',
            'users',
            'User1@org2.example.com',
            'msp',
            'keystore'
        ),
        certPath: path.resolve(
            __dirname,
            '..',
            '..',
            '..',
            'test-network',
            'organizations',
            'peerOrganizations',
            'org2.example.com',
            'users',
            'User1@org2.example.com',
            'msp',
            'signcerts'
        ),
        peerEndpoint: 'localhost:9051', // Peer endpoint for Org2
        peerHostAlias: 'peer0.org2.example.com',
        mspId: 'Org2MSP',
        tlsCertPath: path.resolve(
            __dirname,
            '..',
            '..',
            '..',
            'test-network',
            'organizations',
            'peerOrganizations',
            'org2.example.com',
            'peers',
            'peer0.org2.example.com',
            'tls',
            'ca.crt'
        ),
    },
};

const utf8Decoder = new TextDecoder();
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

// Prompt for operation and user input
async function promptUser(question) {
    return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
    try {
        // Prompt user for organization and user selection
        const org = await promptUser('Select organization (org1/org2): ');
        const user = await promptUser(`Select user (User1) for ${org}: `);
        const operation = await promptUser(
            'Select operation (CreateNote, ReadNote, UpdateNote, DeleteNote): '
        );

        // Set paths and network details based on selected organization
        const orgData = orgPaths[org];
        if (!orgData) {
            console.error('Invalid organization selected!');
            rl.close();
            return;
        }

        const keyDirectoryPath = orgData.keyPath;
        const certDirectoryPath = orgData.certPath;
        const peerEndpoint = orgData.peerEndpoint;
        const peerHostAlias = orgData.peerHostAlias;
        const mspId = orgData.mspId;
        const tlsCertPath = orgData.tlsCertPath;

        // Initialize gRPC connection and gateway
        const client = await newGrpcConnection(
            tlsCertPath,
            peerEndpoint,
            peerHostAlias
        );
        const gateway = connect({
            client,
            identity: await newIdentity(certDirectoryPath, mspId),
            signer: await newSigner(keyDirectoryPath),
            hash: hash.sha256,
            evaluateOptions: () => ({ deadline: Date.now() + 5000 }), // 5 seconds
            endorseOptions: () => ({ deadline: Date.now() + 15000 }), // 15 seconds
            submitOptions: () => ({ deadline: Date.now() + 5000 }), // 5 seconds
            commitStatusOptions: () => ({ deadline: Date.now() + 60000 }), // 1 minute
        });

        const network = gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);

        // Execute the selected operation
        switch (operation.toLowerCase()) {
            case 'createnote':
                const content = await promptUser('Enter note content: ');
                await createNote(contract, content);
                break;
            case 'readnote':
                const noteID = await promptUser('Enter note ID to read: ');
                await readNoteByID(contract, noteID);
                break;
            case 'updatenote':
                const updateID = await promptUser('Enter note ID to update: ');
                const newContent = await promptUser(
                    'Enter new content for the note: '
                );
                await updateNoteContent(contract, updateID, newContent);
                break;
            case 'deletenote':
                const deleteID = await promptUser('Enter note ID to delete: ');
                await deleteNoteByID(contract, deleteID);
                break;
            default:
                console.log('Invalid operation');
        }

        gateway.close();
        client.close();
    } catch (error) {
        console.error('Error:', error);
    } finally {
        rl.close();
    }
}

main();

async function newGrpcConnection(tlsCertPath, peerEndpoint, peerHostAlias) {
    const tlsRootCert = await fs.readFile(tlsCertPath);
    const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
    return new grpc.Client(peerEndpoint, tlsCredentials, {
        'grpc.ssl_target_name_override': peerHostAlias,
    });
}

async function newIdentity(certDirectoryPath, mspId) {
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

async function newSigner(keyDirectoryPath) {
    const keyPath = await getFirstDirFileName(keyDirectoryPath);
    const privateKeyPem = await fs.readFile(keyPath);
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    return signers.newPrivateKeySigner(privateKey);
}

// Create a new note
async function createNote(contract, content) {
    await contract.submitTransaction('CreateNote', content);
    console.log('*** Transaction committed successfully');
}

// Read note by ID
async function readNoteByID(contract, noteID) {
    const resultBytes = await contract.evaluateTransaction('ReadNote', noteID);
    const resultJson = utf8Decoder.decode(resultBytes);
    const result = JSON.parse(resultJson);
    console.log('*** Result:', result);
}

// Update an existing note
async function updateNoteContent(contract, noteID, content) {
    await contract.submitTransaction('UpdateNote', noteID, content);
    console.log('*** Transaction committed successfully');
}

// Delete note by ID
async function deleteNoteByID(contract, noteID) {
    await contract.submitTransaction('DeleteNote', noteID);
    console.log('*** Transaction committed successfully');
}
