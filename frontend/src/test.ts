const { MessageQueue } = require('./messageQueue');

async function testCommunication() {
    const mq = new MessageQueue();
    
    // Set up message listener
    mq.on('message', (data) => {
        console.log('Received message:', data);
    });

    // Set up error listener
    mq.on('error', (error) => {
        console.error('Error:', error);
    });

    // Connect to the Python process
    await mq.connect();

    // Send a test message
    const testMessage = {
        type: 'test',
        data: { message: 'Hello from TypeScript!' }
    };

    console.log('Sending test message:', testMessage);
    await mq.send(testMessage);

    // Keep the process running for a while to receive the response
    setTimeout(() => {
        mq.stop();
        process.exit(0);
    }, 5000);
}

testCommunication().catch(console.error); 