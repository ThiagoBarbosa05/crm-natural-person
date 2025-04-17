import { DeleteMessageCommand, DeleteMessageRequest, Message, ReceiveMessageCommand, ReceiveMessageRequest, SQSClient } from "@aws-sdk/client-sqs";
import "dotenv/config"

export class QueueService {
  private client: SQSClient

  constructor() {
    this.client = new SQSClient({ region: 'us-east-2' })
  }

  async getMessages() {
     const input:ReceiveMessageRequest = {
        QueueUrl: process.env.QUEUE_URL,
        MaxNumberOfMessages: 10
      }
    
      const command = new ReceiveMessageCommand(input)

      try { 
        const response = await this.client.send(command)
        return response.Messages
      } catch (error) {
        console.error(`❌ Não foi possível recuperar mensagens da QUEUE: ${error}`)
      }      
  }

  async deleteMessage(message: Message) {
       const deleteMesage: DeleteMessageRequest = {
        QueueUrl: "https://sqs.us-east-2.amazonaws.com/025691313279/BlingNaturalPerson.fifo",
        ReceiptHandle: message.ReceiptHandle
      }
      
      await this.client.send(new DeleteMessageCommand(deleteMesage))
  }

}