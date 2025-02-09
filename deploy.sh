#!/bin/bash

# Exit on any error
set -e

# Download the Fabric installation script
if [ ! -f "install-fabric.sh" ]; then
    curl -sSLO https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh && chmod +x install-fabric.sh
fi

# Run the script to install Fabric binaries, Docker images, and samples
./install-fabric.sh binary docker samples

# Move chaincode folder to test-network directory (if it exists)
if [ -d "chaincode" ]; then
    mv chaincode fabric-samples/test-network/
fi

# Move into the fabric-samples directory
cd fabric-samples

# Navigate to the test-network directory
cd test-network

# Shut down any existing network and bring it up, creating the channel
./network.sh down
./network.sh up createChannel -c hyperjots -ca

# Set the environment variables
export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=$PWD/../config/

# Print peer version to ensure that Hyperledger Fabric is set up correctly
peer version

# Package the chaincode from the Go chaincode folder
peer lifecycle chaincode package hyperjots_chaincode.tar.gz --path ./chaincode/go --lang golang --label basic_1.0

# Install the chaincode for Org1
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID=Org1MSP
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051
peer lifecycle chaincode install hyperjots_chaincode.tar.gz

# Install the chaincode for Org2
export CORE_PEER_LOCALMSPID=Org2MSP
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
export CORE_PEER_ADDRESS=localhost:9051
peer lifecycle chaincode install hyperjots_chaincode.tar.gz

# Query installed chaincode to get the package ID
CHAINCODE_PACKAGE_ID=$(peer lifecycle chaincode queryinstalled | grep 'Package ID' | sed -n 's/Package ID: \(.*\), Label.*/\1/p')

# Ensure that the Chaincode Package ID was found
if [ -z "$CHAINCODE_PACKAGE_ID" ]; then
    echo "Error: Chaincode package ID not found."
    exit 1
fi

echo "Chaincode Package ID: $CHAINCODE_PACKAGE_ID"

# Approve chaincode for Org1
export CORE_PEER_LOCALMSPID=Org1MSP
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_ADDRESS=localhost:7051
peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --channelID hyperjots --name basic --version 1.0 --package-id $CHAINCODE_PACKAGE_ID --sequence 1 --tls --cafile "${PWD}/organizations/ordererOrganizations/exam
