import type { Recipe } from '../types';

// Generated from docs/info2update_formula.csv. Do not edit recipe rows by hand.
export const RECIPES: Recipe[] = [
  {
    "id": "fluid-pump_recipe_1",
    "name": "水泵：→ 清水",
    "machineId": "fluid-pump",
    "durationSeconds": 1,
    "inputs": [],
    "outputs": [
      {
        "materialId": "clean_water",
        "name": "清水",
        "amount": 1
      }
    ]
  },
  {
    "id": "acid-resistant-pump-mk-ii_recipe_1",
    "name": "二型耐酸水泵：→ 清水",
    "machineId": "acid-resistant-pump-mk-ii",
    "durationSeconds": 1,
    "inputs": [],
    "outputs": [
      {
        "materialId": "clean_water",
        "name": "清水",
        "amount": 1
      }
    ]
  },
  {
    "id": "acid-resistant-pump-mk-ii_recipe_2",
    "name": "二型耐酸水泵：→ 沉积酸",
    "machineId": "acid-resistant-pump-mk-ii",
    "durationSeconds": 1,
    "inputs": [],
    "outputs": [
      {
        "materialId": "precipitation_acid",
        "name": "沉积酸",
        "amount": 1
      }
    ]
  },
  {
    "id": "fluid-supply-unit_recipe_1",
    "name": "给水器：清水 →",
    "machineId": "fluid-supply-unit",
    "durationSeconds": 1,
    "inputs": [
      {
        "materialId": "clean_water",
        "name": "清水",
        "amount": 1
      }
    ],
    "outputs": []
  },
  {
    "id": "fluid-supply-unit_recipe_2",
    "name": "给水器：沉积酸 →",
    "machineId": "fluid-supply-unit",
    "durationSeconds": 1,
    "inputs": [
      {
        "materialId": "precipitation_acid",
        "name": "沉积酸",
        "amount": 1
      }
    ],
    "outputs": []
  },
  {
    "id": "filling-unit_recipe_1_1",
    "name": "灌装机：*瓶子、*液体 → *瓶子(*液体)",
    "machineId": "filling-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "name": "*瓶子",
        "amount": 1,
        "isWildcard": true
      },
      {
        "name": "*液体",
        "amount": 1,
        "isWildcard": true
      }
    ],
    "outputs": [
      {
        "name": "*瓶子(*液体)",
        "amount": 1,
        "isWildcard": true
      }
    ]
  },
  {
    "id": "separating-unit_recipe_2_1",
    "name": "拆解机：*瓶子(*液体) → *瓶子、*液体",
    "machineId": "separating-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "name": "*瓶子(*液体)",
        "amount": 1,
        "isWildcard": true
      }
    ],
    "outputs": [
      {
        "name": "*瓶子",
        "amount": 1,
        "isWildcard": true
      },
      {
        "name": "*液体",
        "amount": 1,
        "isWildcard": true
      }
    ]
  },
  {
    "id": "planting-unit_recipe_3_1",
    "name": "种植机：荞花种子 → 荞花",
    "machineId": "planting-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "buckflower_seed",
        "name": "荞花种子",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "buckflower",
        "name": "荞花",
        "amount": 1
      }
    ]
  },
  {
    "id": "planting-unit_recipe_4_1",
    "name": "种植机：柑实种子 → 柑实",
    "machineId": "planting-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "citrome_seed",
        "name": "柑实种子",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "citrome",
        "name": "柑实",
        "amount": 1
      }
    ]
  },
  {
    "id": "planting-unit_recipe_5_1",
    "name": "种植机：砂叶种子 → 砂叶",
    "machineId": "planting-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "sandleaf_seed",
        "name": "砂叶种子",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "sandleaf",
        "name": "砂叶",
        "amount": 1
      }
    ]
  },
  {
    "id": "planting-unit_recipe_6_1",
    "name": "种植机：酮化树种 → 酮化灌木",
    "machineId": "planting-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "aketine_seed",
        "name": "酮化树种",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "aketine",
        "name": "酮化灌木",
        "amount": 1
      }
    ]
  },
  {
    "id": "planting-unit_recipe_7_1",
    "name": "种植机：锦草种子、清水 → 2锦草",
    "machineId": "planting-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "jincao_seed",
        "name": "锦草种子",
        "amount": 1
      },
      {
        "materialId": "clean_water",
        "name": "清水",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "jincao",
        "name": "锦草",
        "amount": 2
      }
    ]
  },
  {
    "id": "planting-unit_recipe_8_1",
    "name": "种植机：芽针种子、清水 → 2芽针",
    "machineId": "planting-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "yazhen_seed",
        "name": "芽针种子",
        "amount": 1
      },
      {
        "materialId": "clean_water",
        "name": "清水",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "yazhen",
        "name": "芽针",
        "amount": 2
      }
    ]
  },
  {
    "id": "seed-picking-unit_recipe_9_1",
    "name": "采种机：荞花 → 2荞花种子",
    "machineId": "seed-picking-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "buckflower",
        "name": "荞花",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "buckflower_seed",
        "name": "荞花种子",
        "amount": 2
      }
    ]
  },
  {
    "id": "seed-picking-unit_recipe_10_1",
    "name": "采种机：柑实 → 2柑实种子",
    "machineId": "seed-picking-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "citrome",
        "name": "柑实",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "citrome_seed",
        "name": "柑实种子",
        "amount": 2
      }
    ]
  },
  {
    "id": "seed-picking-unit_recipe_11_1",
    "name": "采种机：砂叶 → 2砂叶种子",
    "machineId": "seed-picking-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "sandleaf",
        "name": "砂叶",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "sandleaf_seed",
        "name": "砂叶种子",
        "amount": 2
      }
    ]
  },
  {
    "id": "seed-picking-unit_recipe_12_1",
    "name": "采种机：酮化灌木 → 2酮化树种",
    "machineId": "seed-picking-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "aketine",
        "name": "酮化灌木",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "aketine_seed",
        "name": "酮化树种",
        "amount": 2
      }
    ]
  },
  {
    "id": "seed-picking-unit_recipe_13_1",
    "name": "采种机：锦草 → 锦草种子",
    "machineId": "seed-picking-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "jincao",
        "name": "锦草",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "jincao_seed",
        "name": "锦草种子",
        "amount": 1
      }
    ]
  },
  {
    "id": "seed-picking-unit_recipe_14_1",
    "name": "采种机：芽针 → 芽针种子",
    "machineId": "seed-picking-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "yazhen",
        "name": "芽针",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "yazhen_seed",
        "name": "芽针种子",
        "amount": 1
      }
    ]
  },
  {
    "id": "refining-unit_recipe_15_1",
    "name": "精炼炉：蓝铁矿 → 蓝铁块",
    "machineId": "refining-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "ferrium_ore",
        "name": "蓝铁矿",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "ferrium",
        "name": "蓝铁块",
        "amount": 1
      }
    ]
  },
  {
    "id": "refining-unit_recipe_16_1",
    "name": "精炼炉：蓝铁粉末 → 蓝铁块",
    "machineId": "refining-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "ferrium_powder",
        "name": "蓝铁粉末",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "ferrium",
        "name": "蓝铁块",
        "amount": 1
      }
    ]
  },
  {
    "id": "refining-unit_recipe_17_1",
    "name": "精炼炉：紫晶矿 → 紫晶纤维",
    "machineId": "refining-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "amethyst_ore",
        "name": "紫晶矿",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "anhethyst_fiber",
        "name": "紫晶纤维",
        "amount": 1
      }
    ]
  },
  {
    "id": "refining-unit_recipe_18_1",
    "name": "精炼炉：紫晶粉末 → 紫晶纤维",
    "machineId": "refining-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "amethyst_powder",
        "name": "紫晶粉末",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "anhethyst_fiber",
        "name": "紫晶纤维",
        "amount": 1
      }
    ]
  },
  {
    "id": "refining-unit_recipe_19_1",
    "name": "精炼炉：源矿 → 晶体外壳",
    "machineId": "refining-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "originium_ore",
        "name": "源矿",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "origocrust",
        "name": "晶体外壳",
        "amount": 1
      }
    ]
  },
  {
    "id": "refining-unit_recipe_20_1",
    "name": "精炼炉：晶体外壳粉末 → 晶体外壳",
    "machineId": "refining-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "origocrust_powder",
        "name": "晶体外壳粉末",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "origocrust",
        "name": "晶体外壳",
        "amount": 1
      }
    ]
  },
  {
    "id": "refining-unit_recipe_21_1",
    "name": "精炼炉：致密晶体粉末 → 密制晶体",
    "machineId": "refining-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "dense_origocrust_powder",
        "name": "致密晶体粉末",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "packed_origocrust",
        "name": "密制晶体",
        "amount": 1
      }
    ]
  },
  {
    "id": "refining-unit_recipe_22_1",
    "name": "精炼炉：致密蓝铁粉末 → 钢块",
    "machineId": "refining-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "dense_ferrium_powder",
        "name": "致密蓝铁粉末",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "steel",
        "name": "钢块",
        "amount": 1
      }
    ]
  },
  {
    "id": "refining-unit_recipe_23_1",
    "name": "精炼炉：高晶粉末 → 高晶纤维",
    "machineId": "refining-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "cryston_powder",
        "name": "高晶粉末",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "cryston_fiber",
        "name": "高晶纤维",
        "amount": 1
      }
    ]
  },
  {
    "id": "refining-unit_recipe_24_1",
    "name": "精炼炉：致密碳粉末 → 稳定碳块",
    "machineId": "refining-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "dense_carbon_powder",
        "name": "致密碳粉末",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "stabilized_carbon",
        "name": "稳定碳块",
        "amount": 1
      }
    ]
  },
  {
    "id": "refining-unit_recipe_25_1",
    "name": "精炼炉：致密源石粉末 → 致密晶体粉末",
    "machineId": "refining-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "dense_originium_powder",
        "name": "致密源石粉末",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "dense_origocrust_powder",
        "name": "致密晶体粉末",
        "amount": 1
      }
    ]
  },
  {
    "id": "refining-unit_recipe_26_1",
    "name": "精炼炉：源石粉末 → 晶体外壳粉末",
    "machineId": "refining-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "originium_powder",
        "name": "源石粉末",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "origocrust_powder",
        "name": "晶体外壳粉末",
        "amount": 1
      }
    ]
  },
  {
    "id": "refining-unit_recipe_27_1",
    "name": "精炼炉：荞花 → 碳块",
    "machineId": "refining-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "buckflower",
        "name": "荞花",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "carbon",
        "name": "碳块",
        "amount": 1
      }
    ]
  },
  {
    "id": "refining-unit_recipe_28_1",
    "name": "精炼炉：柑实 → 碳块",
    "machineId": "refining-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "citrome",
        "name": "柑实",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "carbon",
        "name": "碳块",
        "amount": 1
      }
    ]
  },
  {
    "id": "refining-unit_recipe_29_1",
    "name": "精炼炉：砂叶 → 碳块",
    "machineId": "refining-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "sandleaf",
        "name": "砂叶",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "carbon",
        "name": "碳块",
        "amount": 1
      }
    ]
  },
  {
    "id": "refining-unit_recipe_30_1",
    "name": "精炼炉：锦草 → 2碳块",
    "machineId": "refining-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "jincao",
        "name": "锦草",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "carbon",
        "name": "碳块",
        "amount": 2
      }
    ]
  },
  {
    "id": "refining-unit_recipe_31_1",
    "name": "精炼炉：芽针 → 2碳块",
    "machineId": "refining-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "yazhen",
        "name": "芽针",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "carbon",
        "name": "碳块",
        "amount": 2
      }
    ]
  },
  {
    "id": "refining-unit_recipe_32_1",
    "name": "精炼炉：荞花粉末 → 碳粉末",
    "machineId": "refining-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "buckflower_powder",
        "name": "荞花粉末",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "carbon_powder",
        "name": "碳粉末",
        "amount": 1
      }
    ]
  },
  {
    "id": "refining-unit_recipe_33_1",
    "name": "精炼炉：柑实粉末 → 碳粉末",
    "machineId": "refining-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "citrome_powder",
        "name": "柑实粉末",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "carbon_powder",
        "name": "碳粉末",
        "amount": 1
      }
    ]
  },
  {
    "id": "refining-unit_recipe_34_1",
    "name": "精炼炉：3砂叶粉末 → 3碳粉末",
    "machineId": "refining-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "sandleaf_powder",
        "name": "砂叶粉末",
        "amount": 3
      }
    ],
    "outputs": [
      {
        "materialId": "carbon_powder",
        "name": "碳粉末",
        "amount": 3
      }
    ]
  },
  {
    "id": "refining-unit_recipe_35_1",
    "name": "精炼炉：锦草粉末 → 2碳粉末",
    "machineId": "refining-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "jincao_powder",
        "name": "锦草粉末",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "carbon_powder",
        "name": "碳粉末",
        "amount": 2
      }
    ]
  },
  {
    "id": "refining-unit_recipe_36_1",
    "name": "精炼炉：芽针粉末 → 2碳粉末",
    "machineId": "refining-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "yazhen_powder",
        "name": "芽针粉末",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "carbon_powder",
        "name": "碳粉末",
        "amount": 2
      }
    ]
  },
  {
    "id": "refining-unit_recipe_37_1",
    "name": "精炼炉：细磨荞花粉末 → 致密碳粉末",
    "machineId": "refining-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "ground_buckflower_powder",
        "name": "细磨荞花粉末",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "dense_carbon_powder",
        "name": "致密碳粉末",
        "amount": 1
      }
    ]
  },
  {
    "id": "refining-unit_recipe_38_1",
    "name": "精炼炉：细磨柑实粉末 → 致密碳粉末",
    "machineId": "refining-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "ground_citrome_powder",
        "name": "细磨柑实粉末",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "dense_carbon_powder",
        "name": "致密碳粉末",
        "amount": 1
      }
    ]
  },
  {
    "id": "refining-unit_recipe_39_1",
    "name": "精炼炉：赤铜矿、清水 → 赤铜块、污水",
    "machineId": "refining-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "cuprium_ore",
        "name": "赤铜矿",
        "amount": 1
      },
      {
        "materialId": "clean_water",
        "name": "清水",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "cuprium",
        "name": "赤铜块",
        "amount": 1
      },
      {
        "materialId": "sewage",
        "name": "污水",
        "amount": 1
      }
    ]
  },
  {
    "id": "shredding-unit_recipe_40_1",
    "name": "粉碎机：赤铜块 → 赤铜粉末",
    "machineId": "shredding-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "cuprium",
        "name": "赤铜块",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "cuprium_powder",
        "name": "赤铜粉末",
        "amount": 1
      }
    ]
  },
  {
    "id": "shredding-unit_recipe_41_1",
    "name": "粉碎机：蓝铁块 → 蓝铁粉末",
    "machineId": "shredding-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "ferrium",
        "name": "蓝铁块",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "ferrium_powder",
        "name": "蓝铁粉末",
        "amount": 1
      }
    ]
  },
  {
    "id": "shredding-unit_recipe_42_1",
    "name": "粉碎机：紫晶纤维 → 紫晶粉末",
    "machineId": "shredding-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "anhethyst_fiber",
        "name": "紫晶纤维",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "amethyst_powder",
        "name": "紫晶粉末",
        "amount": 1
      }
    ]
  },
  {
    "id": "shredding-unit_recipe_43_1",
    "name": "粉碎机：源矿 → 源石粉末",
    "machineId": "shredding-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "originium_ore",
        "name": "源矿",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "originium_powder",
        "name": "源石粉末",
        "amount": 1
      }
    ]
  },
  {
    "id": "shredding-unit_recipe_44_1",
    "name": "粉碎机：碳块 → 2碳粉末",
    "machineId": "shredding-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "carbon",
        "name": "碳块",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "carbon_powder",
        "name": "碳粉末",
        "amount": 2
      }
    ]
  },
  {
    "id": "shredding-unit_recipe_45_1",
    "name": "粉碎机：晶体外壳 → 晶体外壳粉末",
    "machineId": "shredding-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "origocrust",
        "name": "晶体外壳",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "origocrust_powder",
        "name": "晶体外壳粉末",
        "amount": 1
      }
    ]
  },
  {
    "id": "shredding-unit_recipe_46_1",
    "name": "粉碎机：荞花 → 2荞花粉末",
    "machineId": "shredding-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "buckflower",
        "name": "荞花",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "buckflower_powder",
        "name": "荞花粉末",
        "amount": 2
      }
    ]
  },
  {
    "id": "shredding-unit_recipe_47_1",
    "name": "粉碎机：柑实 → 2柑实粉末",
    "machineId": "shredding-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "citrome",
        "name": "柑实",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "citrome_powder",
        "name": "柑实粉末",
        "amount": 2
      }
    ]
  },
  {
    "id": "shredding-unit_recipe_48_1",
    "name": "粉碎机：砂叶 → 3砂叶粉末",
    "machineId": "shredding-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "sandleaf",
        "name": "砂叶",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "sandleaf_powder",
        "name": "砂叶粉末",
        "amount": 3
      }
    ]
  },
  {
    "id": "shredding-unit_recipe_49_1",
    "name": "粉碎机：酮化灌木 → 2酮化灌木粉末",
    "machineId": "shredding-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "aketine",
        "name": "酮化灌木",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "aketine_powder",
        "name": "酮化灌木粉末",
        "amount": 2
      }
    ]
  },
  {
    "id": "shredding-unit_recipe_50_1",
    "name": "粉碎机：锦草 → 2锦草粉末",
    "machineId": "shredding-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "jincao",
        "name": "锦草",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "jincao_powder",
        "name": "锦草粉末",
        "amount": 2
      }
    ]
  },
  {
    "id": "shredding-unit_recipe_51_1",
    "name": "粉碎机：芽针 → 2芽针粉末",
    "machineId": "shredding-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "yazhen",
        "name": "芽针",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "yazhen_powder",
        "name": "芽针粉末",
        "amount": 2
      }
    ]
  },
  {
    "id": "fittinguhit_recipe_52_1",
    "name": "配件机：蓝铁块 → 铁制零件",
    "machineId": "fittinguhit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "ferrium",
        "name": "蓝铁块",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "ferrium_part",
        "name": "铁制零件",
        "amount": 1
      }
    ]
  },
  {
    "id": "fittinguhit_recipe_53_1",
    "name": "配件机：紫晶纤维 → 紫晶零件",
    "machineId": "fittinguhit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "anhethyst_fiber",
        "name": "紫晶纤维",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "amethyst_part",
        "name": "紫晶零件",
        "amount": 1
      }
    ]
  },
  {
    "id": "fittinguhit_recipe_54_1",
    "name": "配件机：钢块 → 钢制零件",
    "machineId": "fittinguhit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "steel",
        "name": "钢块",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "steel_part",
        "name": "钢制零件",
        "amount": 1
      }
    ]
  },
  {
    "id": "fittinguhit_recipe_55_1",
    "name": "配件机：高晶纤维 → 高晶零件",
    "machineId": "fittinguhit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "cryston_fiber",
        "name": "高晶纤维",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "cryston_part",
        "name": "高晶零件",
        "amount": 1
      }
    ]
  },
  {
    "id": "fittinguhit_recipe_56_1",
    "name": "配件机：赤铜块 → 赤铜零件",
    "machineId": "fittinguhit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "cuprium",
        "name": "赤铜块",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "cuprium_part",
        "name": "赤铜零件",
        "amount": 1
      }
    ]
  },
  {
    "id": "fittinguhit_recipe_57_1",
    "name": "配件机：5赫铜块 → 赫铜零件",
    "machineId": "fittinguhit",
    "durationSeconds": 10,
    "inputs": [
      {
        "materialId": "hetonite",
        "name": "赫铜块",
        "amount": 5
      }
    ],
    "outputs": [
      {
        "materialId": "hetonite_part",
        "name": "赫铜零件",
        "amount": 1
      }
    ]
  },
  {
    "id": "mouldling-unit_recipe_58_1",
    "name": "塑形机：2蓝铁块 → 蓝铁瓶",
    "machineId": "mouldling-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "ferrium",
        "name": "蓝铁块",
        "amount": 2
      }
    ],
    "outputs": [
      {
        "materialId": "ferrium_bottle",
        "name": "蓝铁瓶",
        "amount": 1
      }
    ]
  },
  {
    "id": "mouldling-unit_recipe_59_1",
    "name": "塑形机：2紫晶纤维 → 紫晶质",
    "machineId": "mouldling-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "anhethyst_fiber",
        "name": "紫晶纤维",
        "amount": 2
      }
    ],
    "outputs": [
      {
        "name": "紫晶质",
        "amount": 1
      }
    ]
  },
  {
    "id": "mouldling-unit_recipe_60_1",
    "name": "塑形机：2钢块 → 钢质瓶",
    "machineId": "mouldling-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "steel",
        "name": "钢块",
        "amount": 2
      }
    ],
    "outputs": [
      {
        "materialId": "steel_bottle",
        "name": "钢质瓶",
        "amount": 1
      }
    ]
  },
  {
    "id": "mouldling-unit_recipe_61_1",
    "name": "塑形机：2高晶纤维 → 高晶质瓶",
    "machineId": "mouldling-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "cryston_fiber",
        "name": "高晶纤维",
        "amount": 2
      }
    ],
    "outputs": [
      {
        "materialId": "cryston_bottle",
        "name": "高晶质瓶",
        "amount": 1
      }
    ]
  },
  {
    "id": "mouldling-unit_recipe_62_1",
    "name": "塑形机：2赤铜块 → 赤铜瓶",
    "machineId": "mouldling-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "cuprium",
        "name": "赤铜块",
        "amount": 2
      }
    ],
    "outputs": [
      {
        "materialId": "cuprium_bottle",
        "name": "赤铜瓶",
        "amount": 1
      }
    ]
  },
  {
    "id": "mouldling-unit_recipe_63_1",
    "name": "塑形机：2赫铜块 → 赫铜瓶",
    "machineId": "mouldling-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "hetonite",
        "name": "赫铜块",
        "amount": 2
      }
    ],
    "outputs": [
      {
        "materialId": "hetonite_bottle",
        "name": "赫铜瓶",
        "amount": 1
      }
    ]
  },
  {
    "id": "water-treatment-unit_recipe_64_1",
    "name": "废水处理机：壞晶废液 → 无产物",
    "machineId": "water-treatment-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "xircon_effluent",
        "name": "壞晶废液",
        "amount": 1
      }
    ],
    "outputs": []
  },
  {
    "id": "water-treatment-unit_recipe_65_1",
    "name": "废水处理机：惰性壞晶废液 → 无产物",
    "machineId": "water-treatment-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "inert_xirconn_effluent",
        "name": "惰性壞晶废液",
        "amount": 1
      }
    ],
    "outputs": []
  },
  {
    "id": "water-treatment-unit_recipe_66_1",
    "name": "废水处理机：污水 → 无产物",
    "machineId": "water-treatment-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "sewage",
        "name": "污水",
        "amount": 1
      }
    ],
    "outputs": []
  },
  {
    "id": "gearing-unit_recipe_67_1",
    "name": "装备原件机：5晶体外壳、5紫晶纤维 → 紫晶装备原件",
    "machineId": "gearing-unit",
    "durationSeconds": 10,
    "inputs": [
      {
        "materialId": "origocrust",
        "name": "晶体外壳",
        "amount": 5
      },
      {
        "materialId": "anhethyst_fiber",
        "name": "紫晶纤维",
        "amount": 5
      }
    ],
    "outputs": [
      {
        "materialId": "amethyst_component",
        "name": "紫晶装备原件",
        "amount": 1
      }
    ]
  },
  {
    "id": "gearing-unit_recipe_68_1",
    "name": "装备原件机：10晶体外壳、10蓝铁块 → 蓝铁装备原件",
    "machineId": "gearing-unit",
    "durationSeconds": 10,
    "inputs": [
      {
        "materialId": "origocrust",
        "name": "晶体外壳",
        "amount": 10
      },
      {
        "materialId": "ferrium",
        "name": "蓝铁块",
        "amount": 10
      }
    ],
    "outputs": [
      {
        "materialId": "ferrium_component",
        "name": "蓝铁装备原件",
        "amount": 1
      }
    ]
  },
  {
    "id": "gearing-unit_recipe_69_1",
    "name": "装备原件机：10密制晶体、10高晶纤维 → 高晶装备原件",
    "machineId": "gearing-unit",
    "durationSeconds": 10,
    "inputs": [
      {
        "materialId": "packed_origocrust",
        "name": "密制晶体",
        "amount": 10
      },
      {
        "materialId": "cryston_fiber",
        "name": "高晶纤维",
        "amount": 10
      }
    ],
    "outputs": [
      {
        "materialId": "cryston_component",
        "name": "高晶装备原件",
        "amount": 1
      }
    ]
  },
  {
    "id": "gearing-unit_recipe_70_1",
    "name": "装备原件机：10密制晶体、10息壤 → 息壞装备原件",
    "machineId": "gearing-unit",
    "durationSeconds": 10,
    "inputs": [
      {
        "materialId": "packed_origocrust",
        "name": "密制晶体",
        "amount": 10
      },
      {
        "materialId": "xiranite",
        "name": "息壤",
        "amount": 10
      }
    ],
    "outputs": [
      {
        "materialId": "xiranite_component",
        "name": "息壞装备原件",
        "amount": 1
      }
    ]
  },
  {
    "id": "gearing-unit_recipe_71_1",
    "name": "装备原件机：10赤铜零件、10息壤 → 赤铜装备原件",
    "machineId": "gearing-unit",
    "durationSeconds": 10,
    "inputs": [
      {
        "materialId": "cuprium_part",
        "name": "赤铜零件",
        "amount": 10
      },
      {
        "materialId": "xiranite",
        "name": "息壤",
        "amount": 10
      }
    ],
    "outputs": [
      {
        "materialId": "cuprium_component",
        "name": "赤铜装备原件",
        "amount": 1
      }
    ]
  },
  {
    "id": "gearing-unit_recipe_72_1",
    "name": "装备原件机：2赫铜零件、2重息壤 → 赫铜装备原件",
    "machineId": "gearing-unit",
    "durationSeconds": 10,
    "inputs": [
      {
        "materialId": "hetonite_part",
        "name": "赫铜零件",
        "amount": 2
      },
      {
        "materialId": "heavy_xiranite",
        "name": "重息壤",
        "amount": 2
      }
    ],
    "outputs": [
      {
        "materialId": "hetonite_component",
        "name": "赫铜装备原件",
        "amount": 1
      }
    ]
  },
  {
    "id": "filling-unit_recipe_73_1",
    "name": "灌装机：5紫晶质瓶、5柑实粉末 → 柑实罐头",
    "machineId": "filling-unit",
    "durationSeconds": 10,
    "inputs": [
      {
        "materialId": "amethyst_bottle",
        "name": "紫晶质瓶",
        "amount": 5
      },
      {
        "materialId": "citrome_powder",
        "name": "柑实粉末",
        "amount": 5
      }
    ],
    "outputs": [
      {
        "materialId": "canned_citrome_c",
        "name": "柑实罐头",
        "amount": 1
      }
    ]
  },
  {
    "id": "filling-unit_recipe_74_1",
    "name": "灌装机：10蓝铁瓶、10柑实粉末 → 优质柑实罐头",
    "machineId": "filling-unit",
    "durationSeconds": 10,
    "inputs": [
      {
        "materialId": "ferrium_bottle",
        "name": "蓝铁瓶",
        "amount": 10
      },
      {
        "materialId": "citrome_powder",
        "name": "柑实粉末",
        "amount": 10
      }
    ],
    "outputs": [
      {
        "materialId": "canned_citrome_b",
        "name": "优质柑实罐头",
        "amount": 1
      }
    ]
  },
  {
    "id": "filling-unit_recipe_75_1",
    "name": "灌装机：10钢质瓶、10细磨柑实粉末 → 精选柑实罐头",
    "machineId": "filling-unit",
    "durationSeconds": 10,
    "inputs": [
      {
        "materialId": "steel_bottle",
        "name": "钢质瓶",
        "amount": 10
      },
      {
        "materialId": "ground_citrome_powder",
        "name": "细磨柑实粉末",
        "amount": 10
      }
    ],
    "outputs": [
      {
        "materialId": "canned_citrome_a",
        "name": "精选柑实罐头",
        "amount": 1
      }
    ]
  },
  {
    "id": "filling-unit_recipe_76_1",
    "name": "灌装机：5紫晶质瓶、5荞花粉末 → 荞愈胶囊",
    "machineId": "filling-unit",
    "durationSeconds": 10,
    "inputs": [
      {
        "materialId": "amethyst_bottle",
        "name": "紫晶质瓶",
        "amount": 5
      },
      {
        "materialId": "buckflower_powder",
        "name": "荞花粉末",
        "amount": 5
      }
    ],
    "outputs": [
      {
        "materialId": "buck_capsule_c",
        "name": "荞愈胶囊",
        "amount": 1
      }
    ]
  },
  {
    "id": "filling-unit_recipe_77_1",
    "name": "灌装机：10蓝铁瓶、10荞花粉末 → 优质荞愈胶囊",
    "machineId": "filling-unit",
    "durationSeconds": 10,
    "inputs": [
      {
        "materialId": "ferrium_bottle",
        "name": "蓝铁瓶",
        "amount": 10
      },
      {
        "materialId": "buckflower_powder",
        "name": "荞花粉末",
        "amount": 10
      }
    ],
    "outputs": [
      {
        "materialId": "buck_capsule_b",
        "name": "优质荞愈胶囊",
        "amount": 1
      }
    ]
  },
  {
    "id": "filling-unit_recipe_78_1",
    "name": "灌装机：10钢质瓶、10细磨荞花粉末 → 精选荞愈胶囊",
    "machineId": "filling-unit",
    "durationSeconds": 10,
    "inputs": [
      {
        "materialId": "steel_bottle",
        "name": "钢质瓶",
        "amount": 10
      },
      {
        "materialId": "ground_buckflower_powder",
        "name": "细磨荞花粉末",
        "amount": 10
      }
    ],
    "outputs": [
      {
        "materialId": "buck_capsule_a",
        "name": "精选荞愈胶囊",
        "amount": 1
      }
    ]
  },
  {
    "id": "packaging-unit_recipe_79_1",
    "name": "封装机：5紫晶零件、酮化灌木粉末 → 工业爆炸物",
    "machineId": "packaging-unit",
    "durationSeconds": 10,
    "inputs": [
      {
        "materialId": "amethyst_part",
        "name": "紫晶零件",
        "amount": 5
      },
      {
        "materialId": "aketine_powder",
        "name": "酮化灌木粉末",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "industrial_explosive",
        "name": "工业爆炸物",
        "amount": 1
      }
    ]
  },
  {
    "id": "packaging-unit_recipe_80_1",
    "name": "封装机：5紫晶零件、10源石粉末 → 低容谷地电池",
    "machineId": "packaging-unit",
    "durationSeconds": 10,
    "inputs": [
      {
        "materialId": "amethyst_part",
        "name": "紫晶零件",
        "amount": 5
      },
      {
        "materialId": "originium_powder",
        "name": "源石粉末",
        "amount": 10
      }
    ],
    "outputs": [
      {
        "materialId": "lc_valley_battery",
        "name": "低容谷地电池",
        "amount": 1
      }
    ]
  },
  {
    "id": "packaging-unit_recipe_81_1",
    "name": "封装机：10铁制零件、15源石粉末 → 中容谷地电池",
    "machineId": "packaging-unit",
    "durationSeconds": 10,
    "inputs": [
      {
        "materialId": "ferrium_part",
        "name": "铁制零件",
        "amount": 10
      },
      {
        "materialId": "originium_powder",
        "name": "源石粉末",
        "amount": 15
      }
    ],
    "outputs": [
      {
        "materialId": "sc_valley_battery",
        "name": "中容谷地电池",
        "amount": 1
      }
    ]
  },
  {
    "id": "packaging-unit_recipe_82_1",
    "name": "封装机：10钢制零件、15致密源石粉末 → 高容谷地电池",
    "machineId": "packaging-unit",
    "durationSeconds": 10,
    "inputs": [
      {
        "materialId": "steel_part",
        "name": "钢制零件",
        "amount": 10
      },
      {
        "materialId": "dense_originium_powder",
        "name": "致密源石粉末",
        "amount": 15
      }
    ],
    "outputs": [
      {
        "materialId": "hc_valley_battery",
        "name": "高容谷地电池",
        "amount": 1
      }
    ]
  },
  {
    "id": "packaging-unit_recipe_83_1",
    "name": "封装机：10铁制零件、5蓝铁瓶(芽针溶液) → 芽针针剂",
    "machineId": "packaging-unit",
    "durationSeconds": 10,
    "inputs": [
      {
        "materialId": "ferrium_part",
        "name": "铁制零件",
        "amount": 10
      },
      {
        "name": "蓝铁瓶(芽针溶液)",
        "amount": 5
      }
    ],
    "outputs": [
      {
        "materialId": "yazhen_syringe_c",
        "name": "芽针针剂",
        "amount": 1
      }
    ]
  },
  {
    "id": "packaging-unit_recipe_84_1",
    "name": "封装机：10赤铜零件、5赤铜瓶(芽针溶液) → 优质芽针针剂",
    "machineId": "packaging-unit",
    "durationSeconds": 10,
    "inputs": [
      {
        "materialId": "cuprium_part",
        "name": "赤铜零件",
        "amount": 10
      },
      {
        "name": "赤铜瓶(芽针溶液)",
        "amount": 5
      }
    ],
    "outputs": [
      {
        "materialId": "yazhen_syringe_a",
        "name": "优质芽针针剂",
        "amount": 1
      }
    ]
  },
  {
    "id": "packaging-unit_recipe_85_1",
    "name": "封装机：10铁制零件、5蓝铁瓶(锦草溶液) → 锦草软饮",
    "machineId": "packaging-unit",
    "durationSeconds": 10,
    "inputs": [
      {
        "materialId": "ferrium_part",
        "name": "铁制零件",
        "amount": 10
      },
      {
        "name": "蓝铁瓶(锦草溶液)",
        "amount": 5
      }
    ],
    "outputs": [
      {
        "materialId": "jincao_drink",
        "name": "锦草软饮",
        "amount": 1
      }
    ]
  },
  {
    "id": "packaging-unit_recipe_86_1",
    "name": "封装机：10赤铜零件、5赤铜瓶(锦草溶液) → 优质锦草软饮",
    "machineId": "packaging-unit",
    "durationSeconds": 10,
    "inputs": [
      {
        "materialId": "cuprium_part",
        "name": "赤铜零件",
        "amount": 10
      },
      {
        "name": "赤铜瓶(锦草溶液)",
        "amount": 5
      }
    ],
    "outputs": [
      {
        "materialId": "jincao_tea",
        "name": "优质锦草软饮",
        "amount": 1
      }
    ]
  },
  {
    "id": "packaging-unit_recipe_87_1",
    "name": "封装机：5息壤、15致密源石粉末 → 低容武陵电池",
    "machineId": "packaging-unit",
    "durationSeconds": 10,
    "inputs": [
      {
        "materialId": "xiranite",
        "name": "息壤",
        "amount": 5
      },
      {
        "materialId": "dense_originium_powder",
        "name": "致密源石粉末",
        "amount": 15
      }
    ],
    "outputs": [
      {
        "materialId": "lc_wulin_battery",
        "name": "低容武陵电池",
        "amount": 1
      }
    ]
  },
  {
    "id": "packaging-unit_recipe_88_1",
    "name": "封装机：5壞晶、20致密源石粉末 → 中容武陵电池",
    "machineId": "packaging-unit",
    "durationSeconds": 10,
    "inputs": [
      {
        "materialId": "xircon",
        "name": "壞晶",
        "amount": 5
      },
      {
        "materialId": "dense_originium_powder",
        "name": "致密源石粉末",
        "amount": 20
      }
    ],
    "outputs": [
      {
        "materialId": "sc_wulin_battery",
        "name": "中容武陵电池",
        "amount": 1
      }
    ]
  },
  {
    "id": "grinding-unit_recipe_89_1",
    "name": "研磨机：2蓝铁粉末、砂叶粉末 → 致密蓝铁粉末",
    "machineId": "grinding-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "ferrium_powder",
        "name": "蓝铁粉末",
        "amount": 2
      },
      {
        "materialId": "sandleaf_powder",
        "name": "砂叶粉末",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "dense_ferrium_powder",
        "name": "致密蓝铁粉末",
        "amount": 1
      }
    ]
  },
  {
    "id": "grinding-unit_recipe_90_1",
    "name": "研磨机：2紫晶粉末、砂叶粉末 → 高晶粉末",
    "machineId": "grinding-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "amethyst_powder",
        "name": "紫晶粉末",
        "amount": 2
      },
      {
        "materialId": "sandleaf_powder",
        "name": "砂叶粉末",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "cryston_powder",
        "name": "高晶粉末",
        "amount": 1
      }
    ]
  },
  {
    "id": "grinding-unit_recipe_91_1",
    "name": "研磨机：2源石粉末、砂叶粉末 → 致密源石粉末",
    "machineId": "grinding-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "originium_powder",
        "name": "源石粉末",
        "amount": 2
      },
      {
        "materialId": "sandleaf_powder",
        "name": "砂叶粉末",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "dense_originium_powder",
        "name": "致密源石粉末",
        "amount": 1
      }
    ]
  },
  {
    "id": "grinding-unit_recipe_92_1",
    "name": "研磨机：2碳粉末、砂叶粉末 → 致密碳粉末",
    "machineId": "grinding-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "carbon_powder",
        "name": "碳粉末",
        "amount": 2
      },
      {
        "materialId": "sandleaf_powder",
        "name": "砂叶粉末",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "dense_carbon_powder",
        "name": "致密碳粉末",
        "amount": 1
      }
    ]
  },
  {
    "id": "grinding-unit_recipe_93_1",
    "name": "研磨机：2晶体外壳粉末、砂叶粉末 → 致密晶体粉末",
    "machineId": "grinding-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "origocrust_powder",
        "name": "晶体外壳粉末",
        "amount": 2
      },
      {
        "materialId": "sandleaf_powder",
        "name": "砂叶粉末",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "dense_origocrust_powder",
        "name": "致密晶体粉末",
        "amount": 1
      }
    ]
  },
  {
    "id": "grinding-unit_recipe_94_1",
    "name": "研磨机：2荞花粉末、砂叶粉末 → 细磨荞花粉末",
    "machineId": "grinding-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "buckflower_powder",
        "name": "荞花粉末",
        "amount": 2
      },
      {
        "materialId": "sandleaf_powder",
        "name": "砂叶粉末",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "ground_buckflower_powder",
        "name": "细磨荞花粉末",
        "amount": 1
      }
    ]
  },
  {
    "id": "grinding-unit_recipe_95_1",
    "name": "研磨机：2柑实粉末、砂叶粉末 → 细磨柑实粉末",
    "machineId": "grinding-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "citrome_powder",
        "name": "柑实粉末",
        "amount": 2
      },
      {
        "materialId": "sandleaf_powder",
        "name": "砂叶粉末",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "ground_citrome_powder",
        "name": "细磨柑实粉末",
        "amount": 1
      }
    ]
  },
  {
    "id": "reactor-crucible_recipe_96_1",
    "name": "反应池：锦草粉末、清水 → 锦草溶液",
    "machineId": "reactor-crucible",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "jincao_powder",
        "name": "锦草粉末",
        "amount": 1
      },
      {
        "materialId": "clean_water",
        "name": "清水",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "jincao_solution",
        "name": "锦草溶液",
        "amount": 1
      }
    ]
  },
  {
    "id": "expanded-crucible_recipe_96_2",
    "name": "扩容反应池：锦草粉末、清水 → 锦草溶液",
    "machineId": "expanded-crucible",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "jincao_powder",
        "name": "锦草粉末",
        "amount": 1
      },
      {
        "materialId": "clean_water",
        "name": "清水",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "jincao_solution",
        "name": "锦草溶液",
        "amount": 1
      }
    ]
  },
  {
    "id": "reactor-crucible_recipe_97_1",
    "name": "反应池：芽针粉末、清水 → 芽针溶液",
    "machineId": "reactor-crucible",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "yazhen_powder",
        "name": "芽针粉末",
        "amount": 1
      },
      {
        "materialId": "clean_water",
        "name": "清水",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "yazhen_solution",
        "name": "芽针溶液",
        "amount": 1
      }
    ]
  },
  {
    "id": "expanded-crucible_recipe_97_2",
    "name": "扩容反应池：芽针粉末、清水 → 芽针溶液",
    "machineId": "expanded-crucible",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "yazhen_powder",
        "name": "芽针粉末",
        "amount": 1
      },
      {
        "materialId": "clean_water",
        "name": "清水",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "yazhen_solution",
        "name": "芽针溶液",
        "amount": 1
      }
    ]
  },
  {
    "id": "reactor-crucible_recipe_98_1",
    "name": "反应池：息壤、清水 → 液化息壞",
    "machineId": "reactor-crucible",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "xiranite",
        "name": "息壤",
        "amount": 1
      },
      {
        "materialId": "clean_water",
        "name": "清水",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "liquid_xiranite",
        "name": "液化息壞",
        "amount": 1
      }
    ]
  },
  {
    "id": "expanded-crucible_recipe_98_2",
    "name": "扩容反应池：息壤、清水 → 液化息壞",
    "machineId": "expanded-crucible",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "xiranite",
        "name": "息壤",
        "amount": 1
      },
      {
        "materialId": "clean_water",
        "name": "清水",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "liquid_xiranite",
        "name": "液化息壞",
        "amount": 1
      }
    ]
  },
  {
    "id": "reactor-crucible_recipe_99_1",
    "name": "反应池：重息壤、沉积酸 → 液化重息壞",
    "machineId": "reactor-crucible",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "heavy_xiranite",
        "name": "重息壤",
        "amount": 1
      },
      {
        "materialId": "precipitation_acid",
        "name": "沉积酸",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "liquid_heavy_xiranite",
        "name": "液化重息壞",
        "amount": 1
      }
    ]
  },
  {
    "id": "expanded-crucible_recipe_99_2",
    "name": "扩容反应池：重息壤、沉积酸 → 液化重息壞",
    "machineId": "expanded-crucible",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "heavy_xiranite",
        "name": "重息壤",
        "amount": 1
      },
      {
        "materialId": "precipitation_acid",
        "name": "沉积酸",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "liquid_heavy_xiranite",
        "name": "液化重息壞",
        "amount": 1
      }
    ]
  },
  {
    "id": "reactor-crucible_recipe_100_1",
    "name": "反应池：赤铜粉末、沉积酸 → 赤铜溶液",
    "machineId": "reactor-crucible",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "cuprium_powder",
        "name": "赤铜粉末",
        "amount": 1
      },
      {
        "materialId": "precipitation_acid",
        "name": "沉积酸",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "cuprium_solution",
        "name": "赤铜溶液",
        "amount": 1
      }
    ]
  },
  {
    "id": "expanded-crucible_recipe_100_2",
    "name": "扩容反应池：赤铜粉末、沉积酸 → 赤铜溶液",
    "machineId": "expanded-crucible",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "cuprium_powder",
        "name": "赤铜粉末",
        "amount": 1
      },
      {
        "materialId": "precipitation_acid",
        "name": "沉积酸",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "cuprium_solution",
        "name": "赤铜溶液",
        "amount": 1
      }
    ]
  },
  {
    "id": "reactor-crucible_recipe_101_1",
    "name": "反应池：液化息壞、污水 → 壞晶废液、惰性壞晶废液",
    "machineId": "reactor-crucible",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "liquid_xiranite",
        "name": "液化息壞",
        "amount": 1
      },
      {
        "materialId": "sewage",
        "name": "污水",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "xircon_effluent",
        "name": "壞晶废液",
        "amount": 1
      },
      {
        "materialId": "inert_xirconn_effluent",
        "name": "惰性壞晶废液",
        "amount": 1
      }
    ]
  },
  {
    "id": "expanded-crucible_recipe_101_2",
    "name": "扩容反应池：液化息壞、污水 → 壞晶废液、惰性壞晶废液",
    "machineId": "expanded-crucible",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "liquid_xiranite",
        "name": "液化息壞",
        "amount": 1
      },
      {
        "materialId": "sewage",
        "name": "污水",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "xircon_effluent",
        "name": "壞晶废液",
        "amount": 1
      },
      {
        "materialId": "inert_xirconn_effluent",
        "name": "惰性壞晶废液",
        "amount": 1
      }
    ]
  },
  {
    "id": "reactor-crucible_recipe_102_1",
    "name": "反应池：2壞晶废液、蓝铁粉末 → 壞晶、污水",
    "machineId": "reactor-crucible",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "xircon_effluent",
        "name": "壞晶废液",
        "amount": 2
      },
      {
        "materialId": "ferrium_powder",
        "name": "蓝铁粉末",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "xircon",
        "name": "壞晶",
        "amount": 1
      },
      {
        "materialId": "sewage",
        "name": "污水",
        "amount": 1
      }
    ]
  },
  {
    "id": "expanded-crucible_recipe_102_2",
    "name": "扩容反应池：2壞晶废液、蓝铁粉末 → 壞晶、污水",
    "machineId": "expanded-crucible",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "xircon_effluent",
        "name": "壞晶废液",
        "amount": 2
      },
      {
        "materialId": "ferrium_powder",
        "name": "蓝铁粉末",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "xircon",
        "name": "壞晶",
        "amount": 1
      },
      {
        "materialId": "sewage",
        "name": "污水",
        "amount": 1
      }
    ]
  },
  {
    "id": "reactor-crucible_recipe_103_1",
    "name": "反应池：2赫铜溶液、蓝铁粉末 → 赫铜块、污水",
    "machineId": "reactor-crucible",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "hetonite_solution",
        "name": "赫铜溶液",
        "amount": 2
      },
      {
        "materialId": "ferrium_powder",
        "name": "蓝铁粉末",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "hetonite",
        "name": "赫铜块",
        "amount": 1
      },
      {
        "materialId": "sewage",
        "name": "污水",
        "amount": 1
      }
    ]
  },
  {
    "id": "expanded-crucible_recipe_103_2",
    "name": "扩容反应池：2赫铜溶液、蓝铁粉末 → 赫铜块、污水",
    "machineId": "expanded-crucible",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "hetonite_solution",
        "name": "赫铜溶液",
        "amount": 2
      },
      {
        "materialId": "ferrium_powder",
        "name": "蓝铁粉末",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "hetonite",
        "name": "赫铜块",
        "amount": 1
      },
      {
        "materialId": "sewage",
        "name": "污水",
        "amount": 1
      }
    ]
  },
  {
    "id": "forge-of-the-sky_recipe_104_1",
    "name": "天有洪炉：2稳定碳块、清水 → 息壤",
    "machineId": "forge-of-the-sky",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "stabilized_carbon",
        "name": "稳定碳块",
        "amount": 2
      },
      {
        "materialId": "clean_water",
        "name": "清水",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "xiranite",
        "name": "息壤",
        "amount": 1
      }
    ]
  },
  {
    "id": "forge-of-the-sky_recipe_105_1",
    "name": "天有洪炉：10息壤、5壞晶废液 → 重息壤",
    "machineId": "forge-of-the-sky",
    "durationSeconds": 10,
    "inputs": [
      {
        "materialId": "xiranite",
        "name": "息壤",
        "amount": 10
      },
      {
        "materialId": "xircon_effluent",
        "name": "壞晶废液",
        "amount": 5
      }
    ],
    "outputs": [
      {
        "materialId": "heavy_xiranite",
        "name": "重息壤",
        "amount": 1
      }
    ]
  },
  {
    "id": "forge-of-the-sky_recipe_106_1",
    "name": "天有洪炉：驮兽粪便、液化息壞 → 膨地啪",
    "machineId": "forge-of-the-sky",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "burdo_muck",
        "name": "驮兽粪便",
        "amount": 1
      },
      {
        "materialId": "liquid_xiranite",
        "name": "液化息壞",
        "amount": 1
      }
    ],
    "outputs": [
      {
        "materialId": "bumper_rich",
        "name": "膨地啪",
        "amount": 1
      }
    ]
  },
  {
    "id": "puritication-unit_recipe_107_1",
    "name": "提纯机：4惰性壞晶废液 → 壞晶废液、清水",
    "machineId": "puritication-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "inert_xirconn_effluent",
        "name": "惰性壞晶废液",
        "amount": 4
      }
    ],
    "outputs": [
      {
        "materialId": "xircon_effluent",
        "name": "壞晶废液",
        "amount": 1
      },
      {
        "materialId": "clean_water",
        "name": "清水",
        "amount": 1
      }
    ]
  },
  {
    "id": "puritication-unit_recipe_108_1",
    "name": "提纯机：4赤铜溶液 → 赫铜溶液、沉积酸",
    "machineId": "puritication-unit",
    "durationSeconds": 2,
    "inputs": [
      {
        "materialId": "cuprium_solution",
        "name": "赤铜溶液",
        "amount": 4
      }
    ],
    "outputs": [
      {
        "materialId": "hetonite_solution",
        "name": "赫铜溶液",
        "amount": 1
      },
      {
        "materialId": "precipitation_acid",
        "name": "沉积酸",
        "amount": 1
      }
    ]
  }
];
