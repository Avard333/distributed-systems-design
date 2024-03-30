const { Client } = require('hazelcast-client');
const moment = require('moment');

(async () => {
    try{
        const hz = await Client.newHazelcastClient({clusterName:"hz_lab"});
        const topic = await hz.getReliableTopic('dist-topic');
        topic.addMessageListener((message) => {
            console.log(moment().format('HH:mm:ss.SSS'));
            console.log(message.messageObject);
        });
    } catch (err){
        console.error('Error occurred:', err);
    }
})();
