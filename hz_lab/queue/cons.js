const { Client } = require('hazelcast-client');

(async () => {
    try{
        const hz = await Client.newHazelcastClient({clusterName:"hz_lab_queue"});
        const queue = await hz.getQueue('queue');
        for (let i = 0; i < 50; i++){
            taked_item =  await queue.take()
            console.log(`Get ${taked_item}`)
        }

    } catch (err){
        console.error('Error occurred:', err);
    }
})();
