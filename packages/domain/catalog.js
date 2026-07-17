export const CATALOG_SOURCE_URL = "https://cam-buger.ola.click/products";
export const CATALOG_CAPTURED_AT = "2026-07-16";

export const ADD_ONS = [
  ["maionese", "Maionese", 2],
  ["pimentao", "Pimentão", 2],
  ["picles", "Picles", 2],
  ["cebola", "Cebola", 2],
  ["ovo", "Ovo", 3],
  ["barbecue", "Barbecue", 2],
  ["cheddar", "Molho cheddar", 4],
  ["mucarela", "Muçarela", 4],
  ["provolone", "Provolone", 5],
  ["onion-rings-adicional", "Onion rings", 7],
  ["bacon", "Bacon", 10],
  ["calabresa", "Calabresa", 9],
  ["hamburguer", "Hambúrguer", 7],
  ["frango", "Frango", 9],
  ["coracao", "Coração", 10],
  ["alcatra", "Alcatra", 15],
  ["salsichao", "Salsichão", 4]
].map(([sku, name, price]) => ({ sku, name, price }));

const products = [
  ["01-camobuger", "01 CAMOBUGER + BATATA FRITA", "Lanches", 35, "hamburguer"],
  ["02-camobuger-bacon", "02 CAMOBUGER BACON + BATATA FRITA", "Lanches", 37, "hamburguer"],
  ["03-mac-and-cheese", "03 MAC AND CHEESE + BATATA FRITA", "Lanches", 34, "hamburguer"],
  ["04-double-burger", "04 DOUBLE BURGER + BATATA FRITA", "Lanches", 40, "hamburguer"],
  ["05-slider", "05 SLIDER + BATATA FRITA", "Lanches", 33, "hamburguer"],
  ["06-onion-rings", "06 ONION RINGS + BATATA FRITA", "Lanches", 34, "hamburguer"],
  ["07-camoburger-kids", "07 CAMOBURGER KID’S + BATATA FRITA", "Lanches", 28, "hamburguer"],
  ["08-gourmet-frisco", "08 GOURMET FRISCO + BATATA FRITA", "Lanches", 34, "hamburguer"],
  ["09-camoburger-doritos", "09 CAMOBURGER DORITOS + BATATA FRITA", "Lanches", 34, "hamburguer"],
  ["10-camoburger-monster", "10 CAMOBURGER MONSTER + BATATA FRITA", "Lanches", 46, "hamburguer"],
  ["11-camoburger-frango", "11 CAMOBURGER FRANGO + BATATA FRITA", "Lanches", 34, "hamburguer"],
  ["12-camoburger-vegetariano", "12 CAMOBURGER VEGETARIANO + BATATA FRITA", "Lanches", 34, "hamburguer"],
  ["13-camobuger-sausage", "13 CAMOBUGER SAUSAGE + BATATA FRITA", "Lanches", 33, "hamburguer"],
  ["x-simples", "X-SIMPLES", "Xis tradicionais", 24, "xis"],
  ["x-completo", "X-COMPLETO", "Xis tradicionais", 27, "xis"],
  ["x-calabresa", "X-CALABRESA", "Xis tradicionais", 31, "xis"],
  ["x-frango", "X-FRANGO", "Xis tradicionais", 31, "xis"],
  ["x-bacon", "X-BACON", "Xis tradicionais", 36, "xis"],
  ["x-coracao", "X-CORAÇÃO", "Xis tradicionais", 35, "xis"],
  ["x-alcatra", "X-ALCATRA", "Xis tradicionais", 38, "xis"],
  ["x-alcatra-bacon", "X-ALCATRA BACON", "Xis tradicionais", 40, "xis"],
  ["x-alcatra-coracao", "X-ALCATRA CORAÇÃO", "Xis tradicionais", 40, "xis"],
  ["x-frango-bacon", "X-FRANGO BACON", "Xis tradicionais", 36, "xis"],
  ["x-coracao-frango", "X-CORAÇÃO FRANGO", "Xis tradicionais", 36, "xis"],
  ["x-coracao-bacon", "X-CORAÇÃO BACON", "Xis tradicionais", 37, "xis"],
  ["produto-19", "Produto 19", "Xis tradicionais", 0, "xis", false],
  ["x-strogonoff", "X-STROGONOFF", "Xis especiais", 39, "xis"],
  ["x-siciliano", "X-SICILIANO", "Xis especiais", 38, "xis"],
  ["x-fantastico", "X-FANTÁSTICO", "Xis especiais", 39, "xis"],
  ["x-alaminuta", "X-ALAMINUTA", "Xis especiais", 29, "xis"],
  ["x-entreveiro", "X-ENTREVEIRO", "Xis especiais", 40, "xis"],
  ["x-onion-rings", "X-ONION RINGS", "Xis especiais", 31, "xis"],
  ["x-vegetariano", "X-VEGETARIANO", "Xis especiais", 32, "xis"],
  ["dog-tradicional", "DOG TRADICIONA (SALSICHA)", "Dogs", 21, "dog"],
  ["dog-completo", "DOG COMPLETO (SALSICHA)", "Dogs", 25, "dog"],
  ["dog-frango", "DOG FRANGO", "Dogs", 27, "dog"],
  ["dog-calabresa", "DOG CALABRESA", "Dogs", 27, "dog"],
  ["refrigerante-2l", "Refrigerante 2L", "Refrigerantes", 15],
  ["refrigerante-600ml", "Refrigerante 600ml", "Refrigerantes", 8],
  ["refrigerante-lata", "Refrigerante lata", "Refrigerantes", 6],
  ["cerveja-brahma-latao", "Brahma latão", "Cervejas", 8],
  ["cerveja-heineken-latao", "Heineken latão", "Cervejas", 10],
  ["cerveja-original-latao", "Original latão", "Cervejas", 9],
  ["suco-lata", "Suco lata", "Bebidas", 8],
  ["h2o", "H2O", "Bebidas", 7],
  ["aquarius", "Aquarius", "Bebidas", 7],
  ["agua-com-gas", "Água com gás", "Bebidas", 4],
  ["agua-sem-gas", "Água sem gás", "Bebidas", 4],
  ["batata-p", "Batata frita P 200g", "Batatas fritas", 15],
  ["batata-m", "Batata frita M 400g", "Batatas fritas", 21],
  ["batata-g", "Batata frita G 600g", "Batatas fritas", 28]
];

const addonCategories = new Set(["Lanches", "Xis tradicionais", "Xis especiais", "Dogs"]);

export const CATALOG = products.map(
  ([sku, name, category, price, stockCategory = null, available = true]) => ({
    sku,
    name,
    category,
    price,
    description: "",
    stockCategory,
    allowsAddons: addonCategories.has(category),
    available
  })
);
