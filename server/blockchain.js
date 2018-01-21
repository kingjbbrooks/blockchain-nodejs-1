const Block = require('./block');
const axios = require('axios');
const Transaction = require('./transaction');
const PEERS = process.env.PEERS ? process.env.PEERS.split(';') : [];

class BlockChain {

    constructor() {
        // create blockchain array with the first genesis block
        this.chain = [this.createGenesisBlock()];
    }

    createGenesisBlock() {
        return new Block(0, Date.now(), {
            pow: 9,
            transactions: []
        }, '0');
    }

    nextBlock(prevBlock) {
        const index = prevBlock.index + 1;

        return new Block(index, Date.now(), `I'm block ${index}`, prevBlock.hash);
    }

    proofOfWork(lastProof) {
        // Create a variable that we will use to find
        // our next proof of work
        let incrementor = lastProof + 1;
        // Keep incrementing the incrementor until
        // it's equal to a number divisible by 9
        // and the proof of work of the previous
        // block in the chain
        while (!(incrementor % 9 === 0 && incrementor % lastProof === 0)) {
            incrementor += 1;
        }
        // Once that number is found,
        // we can return it as a proof
        // of our work
        return incrementor;
    }

    addBlock(block) {
        this.chain.push(block);
    }

    async mineBlock() {
        await this.consensus();

        const lastBlock = this.chain[this.chain.length - 1];
        const lastProof = lastBlock.data['pow'];

        let nodeTransactions = [];
        /*
            Find the proof of work for
            the current block being mined
            Note: The program will hang here until a new
            proof of work is found
        */
        const proof = this.proofOfWork(lastProof)
        /*
            Once we find a valid proof of work,
            we know we can mine a block so
            we reward the miner by adding a transaction
        */
        nodeTransactions.push(new Transaction('network', 'minerAddress', 1));

        // Now we can gather data to create new block
        const newBlockData = {
            pow: proof,
            transactions: nodeTransactions
        };
        const newBlockIndex = lastBlock.index + 1;
        const newBlockTimestamp = Date.now();
        const lastBlockHash = lastBlock.hash;

        // Empty transaction list
        nodeTransactions = [];

        const minedBlock = new Block(newBlockIndex, newBlockTimestamp, newBlockData, lastBlockHash);

        this.chain.push(minedBlock);

        return minedBlock;
    }

    async consensus() {
        // Get the blocks from other nodes
        const otherChains = await this.findNewChains();
        console.log(`Found other ${otherChains.length} chains`);
        // If our chain isn't longest, then we store the longest chain
        let longest_chain = this.chain;

        for (let chain of otherChains) {
            if (longest_chain.length < chain.length) {
                console.log('Replacing with the other node');
                this.chain = chain.slice();
            }
        }
    }

    async findNewChains() {
        // Get the blockchains of every other node
        const otherChains = [];
        console.log('Searching peer nodes...');

        for (let peer of PEERS) {
            const getBlocks = async peer => {
                try {
                    const response = await axios.get(`${peer}/blocks`);
                    console.log(JSON.stringify(otherChains));
                    otherChains.push(response.data);
                } catch (error) {
                    console.log(`Unable to get blocks from the network ${peer} \n`, error);
                }
            };
            await getBlocks(peer);
        }

        return otherChains.slice();
    }

}

module.exports = BlockChain;
