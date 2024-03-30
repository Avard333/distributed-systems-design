const { Client } = require('hazelcast-client');

(async () => {
    try{

        const hz = await Client.newHazelcastClient({clusterName:"hz_lab"});

        const map = await hz.getMap('dist-map');

        for (let i = 0; i < 1000; i++) {
            await map.put(i, `value${i}`);
        }

        await hz.shutdown();
    } catch (err){
        console.error('Error occurred:', err);
    }
})();
