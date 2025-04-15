import { DeleteMessageCommand, DeleteMessageRequest, ReceiveMessageCommand, ReceiveMessageRequest, SQSClient } from "@aws-sdk/client-sqs"
import { ErpClientResponse } from "./interfaces/queue-response"
import axios from "axios"
import { DynamoDBClient, GetItemCommand, GetItemCommandInput } from "@aws-sdk/client-dynamodb"
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb"
import { Owner } from "./interfaces/owner"

async function test() {
  const sqs = new SQSClient({
    region: "us-east-2"
  })

  const db = new DynamoDBClient({
    region: "us-east-2"
  })

  const input:ReceiveMessageRequest = {
    QueueUrl: "https://sqs.us-east-2.amazonaws.com/025691313279/BlingNaturalPerson.fifo",
    MaxNumberOfMessages: 10
  }

  const command = new ReceiveMessageCommand(input)
  const response = await sqs.send(command)

  if(!response.Messages) return


  for (const message of response.Messages) {
    const salesInfo = JSON.parse(message.Body!) as ErpClientResponse
    
    console.log(salesInfo.client)

    

    try {
      if(salesInfo.client.document) {
        const  existingPloomesContactResponse = await axios.get(`https://api2.ploomes.com/Contacts?$filter=(((TypeId+eq+2)))+and+TypeId+eq+2+and+Register+eq+%27${salesInfo.client.document}%27&$expand=Owner($select=Id,Name,Email)&preload=true`, {
          headers: {
            "User-Key": "AB82DF2CA07637F5F6EFEE7CB15467D2F49DAD2A3E01EE80FE2752E0A992EA2A1CF01952105F1DDF965CF0BACEB3BA702F77352D20A39056260B5553F05A09B2"
          }
        })

        const existingContact = existingPloomesContactResponse.data.value[0]
        
        if(!existingContact) {
          const fristName = salesInfo.client.name.split(" ")[0]
          const params: GetItemCommandInput = {
            TableName: 'PloomesUsers',
            Key: marshall({
              id: 'sellers',
            }),
          }

          const response = await db.send(new GetItemCommand(params))
          const users = unmarshall(response.Item ?? {})

          const owners = users.ListAttribute.map((owner: Owner) => owner)

          const contactOwner = owners.find((owner: Owner) => owner.blingId === salesInfo.client.vendedor)

          const createdContactResponse = await axios.post("https://api2.ploomes.com/Contacts", {
            Name: salesInfo.client.name,
            Register: salesInfo.client.document,
            TypeId: 2,
            Email: salesInfo.client.email,
            OwnerId: contactOwner.ploomesId,
            Phones: [
              {
                PhoneNumber: salesInfo.client.phone
              }
            ],
            OtherProperties: [
              {
                FieldKey: "contact_822D9F87-1B9D-41E4-9327-B82352D1FB65",
                StringValue: fristName
              }
            ]
          }, {
            headers: {
              "User-Key": "AB82DF2CA07637F5F6EFEE7CB15467D2F49DAD2A3E01EE80FE2752E0A992EA2A1CF01952105F1DDF965CF0BACEB3BA702F77352D20A39056260B5553F05A09B2"
            }
          })
        console.log(createdContactResponse.data.value[0])
      }

      
      const deleteMesage: DeleteMessageRequest = {
        QueueUrl: "https://sqs.us-east-2.amazonaws.com/025691313279/BlingNaturalPerson.fifo",
        ReceiptHandle: message.ReceiptHandle
      }
    
      await sqs.send(new DeleteMessageCommand(deleteMesage))
    }
    } catch (error) {
      console.error("‼️ Error: ", error)
    }
  }
}

test()