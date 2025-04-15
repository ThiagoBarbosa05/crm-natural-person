export interface ErpClient {
  id: number
  name: string
  document: string
  phone: string
  email: string
  birthDate: string | Date
  vendedor: number
}

export interface ErpSale {
  id: number
  date: string | Date
  total: number
  items: ErpSaleItem[]
}

export interface ErpSaleItem {
  id: number,
  name: string,
  quantity: number,
  price: number,
  totalPrice: number
}
