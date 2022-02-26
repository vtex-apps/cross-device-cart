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
export const GET_ORDERFORM_QUERY = `
query orderForm($orderFormId: ID) {
  orderForm(orderFormId: $orderFormId) {
    id
    items {
      additionalInfo {
        brandName
      }
      attachments {
        name
        content
      }
      attachmentOfferings {
        name
        required
        schema
      }
      bundleItems {
        additionalInfo {
          brandName
        }
        attachments {
          name
          content
        }
        attachmentOfferings {
          name
          required
          schema
        }
        availability
        detailUrl
        id
        imageUrls {
          at1x
          at2x
          at3x
        }
        listPrice
        measurementUnit
        name
        offerings {
          id
          name
          price
          type
          attachmentOfferings {
            name
            required
            schema
          }
        }
        price
        productCategories
        productCategoryIds
        productRefId
        productId
        quantity
        seller
        sellingPrice
        skuName
        skuSpecifications {
          fieldName
          fieldValues
        }
        unitMultiplier
        uniqueId
        refId
      }
      parentAssemblyBinding
      parentItemIndex
      sellingPriceWithAssemblies
      options {
        assemblyId
        id
        quantity
        seller
        inputValues
        options {
          assemblyId
          id
          quantity
          seller
          inputValues
          options {
            assemblyId
            id
            quantity
            seller
            inputValues
          }
        }
      }
      availability
      detailUrl
      id
      imageUrls {
        at1x
        at2x
        at3x
      }
      listPrice
      manualPrice
      measurementUnit
      name
      offerings {
        id
        name
        price
        type
        attachmentOfferings {
          name
          required
          schema
        }
      }
      price
      priceTags {
        identifier
        isPercentual
        name
        rawValue
        value
      }
      productCategories
      productCategoryIds
      productRefId
      productId
      quantity
      seller
      sellingPrice
      skuName
      skuSpecifications {
        fieldName
        fieldValues
      }
      unitMultiplier
      uniqueId
      refId
      priceTags {
        identifier
        isPercentual
        rawValue
        value
        name
        ratesAndBenefitsIdentifier {
          description
          id
          featured
          name
          matchedParameters
        }
      }
      isGift
    }
    totalizers {
      id
      name
      value
    }
    shipping {
      countries
      availableAddresses {
        addressId
        addressType
        city
        complement
        country
        neighborhood
        number
        postalCode
        receiverName
        reference
        state
        street
        isDisposable
        geoCoordinates
      }
      selectedAddress {
        addressId
        addressType
        city
        complement
        country
        neighborhood
        number
        postalCode
        receiverName
        reference
        state
        street
        isDisposable
        geoCoordinates
      }
      pickupOptions {
        id
        address {
          addressId
          addressType
          city
          complement
          country
          neighborhood
          number
          postalCode
          receiverName
          reference
          state
          street
          isDisposable
          geoCoordinates
        }
        deliveryChannel
        price
        estimate
        isSelected
        friendlyName
        additionalInfo
        storeDistance
        transitTime
        businessHours {
          dayNumber
          closed
          closingTime
          openingTime
        }
      }
      isValid
    }
  }
}
`
export const ADD_ITEMS_MUTATION = `
mutation addToCart($orderFormId: ID, $items: [ItemInput]) {
  orderForm: addToCart(orderFormId: $orderFormId, items: $items) {
    id
    items {
      additionalInfo {
        brandName
      }
      attachments {
        name
        content
      }
      attachmentOfferings {
        name
        required
        schema
      }
      bundleItems {
        additionalInfo {
          brandName
        }
        attachments {
          name
          content
        }
        attachmentOfferings {
          name
          required
          schema
        }
        availability
        detailUrl
        id
        imageUrls {
          at1x
          at2x
          at3x
        }
        listPrice
        measurementUnit
        name
        offerings {
          id
          name
          price
          type
          attachmentOfferings {
            name
            required
            schema
          }
        }
        price
        productCategories
        productCategoryIds
        productRefId
        productId
        quantity
        seller
        sellingPrice
        skuName
        skuSpecifications {
          fieldName
          fieldValues
        }
        unitMultiplier
        uniqueId
        refId
      }
      parentAssemblyBinding
      parentItemIndex
      sellingPriceWithAssemblies
      options {
        assemblyId
        id
        quantity
        seller
        inputValues
        options {
          assemblyId
          id
          quantity
          seller
          inputValues
          options {
            assemblyId
            id
            quantity
            seller
            inputValues
          }
        }
      }
      availability
      detailUrl
      id
      imageUrls {
        at1x
        at2x
        at3x
      }
      listPrice
      manualPrice
      measurementUnit
      name
      offerings {
        id
        name
        price
        type
        attachmentOfferings {
          name
          required
          schema
        }
      }
      price
      priceTags {
        identifier
        isPercentual
        name
        rawValue
        value
      }
      productCategories
      productCategoryIds
      productRefId
      productId
      quantity
      seller
      sellingPrice
      skuName
      skuSpecifications {
        fieldName
        fieldValues
      }
      unitMultiplier
      uniqueId
      refId
      priceTags {
        identifier
        isPercentual
        rawValue
        value
        name
        ratesAndBenefitsIdentifier {
          description
          id
          featured
          name
          matchedParameters
        }
      }
      isGift
    }
    totalizers {
      id
      name
      value
    }
    shipping {
      countries
      availableAddresses {
        addressId
        addressType
        city
        complement
        country
        neighborhood
        number
        postalCode
        receiverName
        reference
        state
        street
        isDisposable
        geoCoordinates
      }
      selectedAddress {
        addressId
        addressType
        city
        complement
        country
        neighborhood
        number
        postalCode
        receiverName
        reference
        state
        street
        isDisposable
        geoCoordinates
      }
      pickupOptions {
        id
        address {
          addressId
          addressType
          city
          complement
          country
          neighborhood
          number
          postalCode
          receiverName
          reference
          state
          street
          isDisposable
          geoCoordinates
        }
        deliveryChannel
        price
        estimate
        isSelected
        friendlyName
        additionalInfo
        storeDistance
        transitTime
        businessHours {
          dayNumber
          closed
          closingTime
          openingTime
        }
      }
      isValid
    }
  }
}
`
