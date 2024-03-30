const { Client } = require('hazelcast-client');

(async () => {
    try{
        const hz = await Client.newHazelcastClient({clusterName:"hz_lab_queue"});
        const queue = await hz.getQueue('queue');
        for (let i = 0; i < 100; i++) {
            await queue.put(i);
            console.log(`Putted ${i}`)
            // await new Promise(r => setTimeout(r, 2000));
        }


    } catch (err){
        console.error('Error occurred:', err);
    }
})();
