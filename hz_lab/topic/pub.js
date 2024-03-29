const { Client } = require('hazelcast-client');

(async () => {
    try{

        const hz = await Client.newHazelcastClient({clusterName:"hz_lab"});
        const topic = await hz.getReliableTopic('dist-topic');

        for (let i = 0; i < 100; i++) {
            await topic.publish(`Message ${i}`);
            console.log(`Published ${i}`)
            await new Promise(r => setTimeout(r, 2000));
        }

        await hz.shutdown();
    } catch (err){
        console.error('Error occurred:', err);
    }
})();
