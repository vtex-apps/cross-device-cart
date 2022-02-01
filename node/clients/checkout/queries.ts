export const GET_ORDERFORM_ITEMS_QUERY = `
query orderForm($orderFormId: ID) {
  orderForm(orderFormId: $orderFormId) {
    items {
      id
      quantity
      seller
      uniqueId
      options {
        assemblyId
        id
        quantity
        seller
        inputValues
      }
    }
  }
}
`
export const UPDATE_ITEMS_MUTATION = `
mutation updateItems($orderFormId: ID, $orderItems: [ItemInput]) {
  updateItems(orderFormId: $orderFormId, orderItems: $orderItems) {
    items {
      availability
      id
      imageUrls {
        at1x
        at2x
        at3x
      }
      listPrice
      price
      productId
      quantity
      seller
      sellingPrice
      skuName
      uniqueId
      options {
        assemblyId
        id
        quantity
        seller
        inputValues
      }
    }
    value
    totalizers {
      id
      name
      value
    }
  }
}
`
