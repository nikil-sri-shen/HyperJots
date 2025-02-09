const express = require('express');
const cors = require('cors');
const grpc = require('@grpc/grpc-js');
const { connect, hash, signers } = require('@hyperledger/fabric-gateway');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

const app = express();
const port = 8080;

// Middleware
app.use(cors());
app.use(
    cors({
        origin: 'http://localhost:3000', // Replace with your front-end URL
    })
);
app.use(express.json());

// Hyperledger configuration
const channelName = 'hyperjots';
const chaincodeName = 'basic';

const orgPaths = {
    org1: {
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
        peerEndpoint: 'localhost:9051',
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

// Helper function to create a new gRPC connection
async function newGrpcConnection(tlsCertPath, peerEndpoint, peerHostAlias) {
    const tlsRootCert = await fs.readFile(tlsCertPath);
    const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
    return new grpc.Client(peerEndpoint, tlsCredentials, {
        'grpc.ssl_target_name_override': peerHostAlias,
    });
}

// Helper function to create a new identity
async function newIdentity(certPath, mspId) {
    const certFiles = await fs.readdir(certPath);
    const cert = await fs.readFile(path.join(certPath, certFiles[0]));
    return { mspId, credentials: cert };
}

// Helper function to create a new signer
async function newSigner(keyPath) {
    const keyFiles = await fs.readdir(keyPath);
    const privateKeyPem = await fs.readFile(path.join(keyPath, keyFiles[0]));
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    return signers.newPrivateKeySigner(privateKey);
}
// Function to get a contract
async function getContract(org) {
    const orgData = orgPaths[org];
    if (!orgData) throw new Error(`Invalid organization: ${org}`);

    const client = await newGrpcConnection(
        orgData.tlsCertPath,
        orgData.peerEndpoint,
        orgData.peerHostAlias
    );

    const gateway = connect({
        client,
        identity: await newIdentity(orgData.certPath, orgData.mspId),
        signer: await newSigner(orgData.keyPath),
        hash: hash.sha256,
    });

    const network = gateway.getNetwork(channelName);
    const contract = network.getContract(chaincodeName);

    return { contract, gateway, client };
}

// Route to create a new note
app.post('/api/createNote', async (req, res) => {
    const { org, title, content } = req.body;

    if (!title || !content) {
        return res
            .status(400)
            .json({ error: 'Title and content are required.' });
    }

    try {
        const { contract, gateway, client } = await getContract(org);

        // Submit the transaction to create a note
        const resultBytes = await contract.submitTransaction(
            'CreateNote',
            title, // Include title
            content
        );

        const noteID = parseInt(resultBytes.toString(), 10); // Convert bytes to string and then to integer

        // Close the gateway and client
        gateway.close();
        client.close();

        // Respond with the success message and the generated noteID
        res.status(201).json({ message: 'Note created successfully', noteID });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route to read a note by ID
app.get('/api/readNote/:id', async (req, res) => {
    const { id } = req.params;
    const org = req.query.org;

    if (!org) {
        return res.status(400).json({
            error: 'Organization (org) is required as a query parameter.',
        });
    }

    try {
        const { contract, gateway, client } = await getContract(org);

        // Evaluate the transaction to read the note
        const resultBytes = await contract.evaluateTransaction('ReadNote', id);

        const resultJson = Buffer.from(resultBytes).toString('utf8');
        const result = JSON.parse(resultJson);

        // Close connections
        gateway.close();
        client.close();

        // Respond with the note data
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route to update a note
app.put('/api/updateNote/:id', async (req, res) => {
    const { org, title, content } = req.body;
    const { id } = req.params;

    if (!title || !content) {
        return res
            .status(400)
            .json({ error: 'Title and content are required.' });
    }

    try {
        const { contract, gateway, client } = await getContract(org);

        // Submit the transaction to update the note
        await contract.submitTransaction('UpdateNote', id, title, content); // Include title

        gateway.close();
        client.close();

        res.status(200).json({ message: 'Note updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route to delete a note
app.delete('/api/deleteNote/:id', async (req, res) => {
    const { org } = req.query;
    const { id } = req.params;

    try {
        const { contract, gateway, client } = await getContract(org);
        await contract.submitTransaction('DeleteNote', id);
        gateway.close();
        client.close();
        res.status(200).json({ message: 'Note deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route to get all notes belonging to the invoking client
app.get('/api/getAllNotes', async (req, res) => {
    const { org } = req.query;

    if (!org) {
        return res.status(400).json({
            error: 'Organization (org) is required as a query parameter.',
        });
    }

    try {
        const { contract, gateway, client } = await getContract(org);

        // Evaluate the transaction to get all notes
        const resultBytes = await contract.evaluateTransaction('GetAllNotes');

        const resultJson = Buffer.from(resultBytes).toString('utf8');
        if (!resultJson || resultJson.trim() === '[]') {
            gateway.close();
            client.close();
            return res.status(200).json({ message: 'No notes available.' });
        }

        const notes = JSON.parse(resultJson);
        notes.sort((a, b) => parseInt(a.noteID) - parseInt(b.noteID));

        // Close connections
        gateway.close();
        client.close();

        res.status(200).json(notes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Backend API is running on http://localhost:${port}`);
});
