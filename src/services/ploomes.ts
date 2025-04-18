import axios from "axios";
import { CrmContact } from "../interfaces/crm-contact";
import "dotenv/config"
import { ploomesLimiter } from "../utils/rate-limiter";
import { retryWithBackOff } from "../utils/retry";

type CreateContactInput = {
  Name: string
  Register: string
  Email: string
  OwnerId: number
  Phones: {
    PhoneNumber: string
  }[]
}

type GetContactInput = {
  document: string | null
  phoneNumber: string | null
}

export class PloomesService {

  async getContact({ document, phoneNumber }: GetContactInput) {
    try {
      let existingPloomesContactResponse: { data :{value: CrmContact[]} } | undefined

      if(document) {
        existingPloomesContactResponse = await ploomesLimiter.schedule(() => 
          retryWithBackOff(() => 
            axios.get(`https://api2.ploomes.com/Contacts?$filter=(((TypeId+eq+2)))+and+TypeId+eq+2+and+Register+eq+%27${document}%27&$expand=Owner($select=Id,Name,Email)&preload=true`, {
              headers: {
                "User-Key": process.env.USER_KEY
              }
            })
          )
        )
      } else if (phoneNumber) {
        existingPloomesContactResponse = await ploomesLimiter.schedule(() => 
          retryWithBackOff(() => 
            axios.get(`https://api2.ploomes.com/Contacts?$filter=Phones/any(p: p/PhoneNumber eq '${phoneNumber}')`, {
              headers: {
                "User-Key": process.env.USER_KEY
              }
            })
          )
        )
      }
      return existingPloomesContactResponse?.data.value[0] ?? null

    } catch (error) {
      console.error("❌ Não foi possível buscar o contato: ", error)
    }

  }

  async createContact(contact: CreateContactInput) {
    const firstName = contact.Name.split(" ")[0]
    try {
      const contactCreated = await ploomesLimiter.schedule(() => 
        retryWithBackOff(() => 
          axios.post("https://api2.ploomes.com/Contacts", {
            ...contact,
             TypeId: 2,
             OtherProperties: [
               {
                 FieldKey: "contact_822D9F87-1B9D-41E4-9327-B82352D1FB65",
                 StringValue: firstName
               }
             ]
           }, {
             headers: {
               "User-Key": "AB82DF2CA07637F5F6EFEE7CB15467D2F49DAD2A3E01EE80FE2752E0A992EA2A1CF01952105F1DDF965CF0BACEB3BA702F77352D20A39056260B5553F05A09B2"
             }
           })
        )
      )
      return contactCreated.data.value[0]
    } catch (error) {
      console.error("❌ Não foi possível criar o contato: ", error)
    }
   
  }
}