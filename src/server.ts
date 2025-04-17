import { DeleteMessageCommand, DeleteMessageRequest, ReceiveMessageCommand, ReceiveMessageRequest, SQSClient } from "@aws-sdk/client-sqs"
import { ErpClientResponse } from "./interfaces/queue-response"
import axios from "axios"
import { DynamoDBClient, GetItemCommand, GetItemCommandInput, QueryCommand } from "@aws-sdk/client-dynamodb"
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb"
import { Owner } from "./interfaces/owner"
import { QueueService } from "./services/queue"
import { PloomesService } from "./services/ploomes"
import { OwnerService } from "./services/owner"

async function test() {

  const db = new DynamoDBClient({
    region: "us-east-2"
  })

  const queue = new QueueService()

  console.log("⏳ Buscando mensagens da QUEUE")
  const messages = await queue.getMessages()
 
  if(!messages) {
    console.log("‼️ Nenhuma mensagem encontrada")
    return
  }
  const ownerService = new OwnerService()

  for (const message of messages) {
    const salesInfo = JSON.parse(message.Body!) as ErpClientResponse
    const owner = await ownerService.getOwner(salesInfo.client.vendedor)
    
    if(salesInfo.client.document) {
      const ploomes = new PloomesService()
      console.log(`⏳ Verificando se o cliente ${salesInfo.client.name} existe no ploomes`)
      const existingContact = await ploomes.getContact(salesInfo.client.document)
        
      if(!existingContact) {
            console.info(`⏳ Criando cliente ${salesInfo.client.name} no Ploomes`)
            const contactCreated = await ploomes.createContact({
              Email: salesInfo.client.email,
              Name: salesInfo.client.name,
              Register: salesInfo.client.document,
              OwnerId: owner.ploomesId,
              Phones: [{ PhoneNumber: salesInfo.client.phone }]
            })
            console.log(`✅ Cliente ${salesInfo.client.name} criado com sucesso no Ploomes`)
            
            // TODO: Criar venda
        }

      console.log(`✅ Cliente ${salesInfo.client.name} já existe no Ploomes}`) 
      
      console.log(`‼️ Removendo message da QUEUE`)
      await queue.deleteMessage(message)
    }
  }
}

test()