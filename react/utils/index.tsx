export const adjustSkuItemForPixelEvent = (skuItem: any) => {
  // Changes this `/Apparel & Accessories/Clothing/Tops/`
  // to this `Apparel & Accessories/Clothing/Tops`
  const category = skuItem.category ? skuItem.category.slice(1, -1) : ''

  return {
    skuId: skuItem.id,
    price: skuItem.price,
    name: skuItem.name,
    quantity: skuItem.quantity,
    brand: skuItem.brand,
    category,
  }
}

export const capitalize = (str: string) => {
  return str.replace(str.charAt(0), str.charAt(0).toUpperCase())
}
