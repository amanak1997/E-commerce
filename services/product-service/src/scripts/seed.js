/**
 * Seed script — populates categories and sample products.
 * Run:  node src/scripts/seed.js
 *       node src/scripts/seed.js --wipe   (drops existing data first)
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const Category = require('../models/Category');
const Product  = require('../models/Product');

const WIPE = process.argv.includes('--wipe');

// ─── Category Definitions ─────────────────────────────────────────────────────
// [ name, slug, description, sortOrder, parentSlug? ]
const TOP_LEVEL = [
  { name: 'Electronics',           slug: 'electronics',           description: 'Gadgets, devices and consumer electronics',        sortOrder: 1 },
  { name: 'Clothing & Apparel',    slug: 'clothing-apparel',      description: 'Men, women and kids fashion',                      sortOrder: 2 },
  { name: 'Home & Kitchen',        slug: 'home-kitchen',          description: 'Furniture, appliances and home essentials',        sortOrder: 3 },
  { name: 'Sports & Fitness',      slug: 'sports-fitness',        description: 'Equipment, apparel and nutrition for active life', sortOrder: 4 },
  { name: 'Books & Media',         slug: 'books-media',           description: 'Books, music, movies and digital media',           sortOrder: 5 },
  { name: 'Beauty & Personal Care',slug: 'beauty-personal-care',  description: 'Skincare, haircare and grooming products',         sortOrder: 6 },
  { name: 'Toys & Games',          slug: 'toys-games',            description: 'Toys, board games and educational kits',           sortOrder: 7 },
  { name: 'Food & Groceries',      slug: 'food-groceries',        description: 'Fresh, packaged and organic food items',           sortOrder: 8 },
];

const SUB_CATEGORIES = [
  // Electronics
  { name: 'Smartphones',        slug: 'smartphones',        description: 'Android and iOS smartphones',          sortOrder: 1, parent: 'electronics' },
  { name: 'Laptops',            slug: 'laptops',            description: 'Ultrabooks, gaming and business laptops',sortOrder: 2, parent: 'electronics' },
  { name: 'Audio & Headphones', slug: 'audio-headphones',   description: 'Earbuds, headphones and speakers',     sortOrder: 3, parent: 'electronics' },
  { name: 'Cameras',            slug: 'cameras',            description: 'DSLRs, mirrorless and action cameras',  sortOrder: 4, parent: 'electronics' },
  { name: 'Smart Home',         slug: 'smart-home',         description: 'Smart displays, hubs and accessories',  sortOrder: 5, parent: 'electronics' },
  { name: 'Tablets',            slug: 'tablets',            description: 'iPads, Android tablets and e-readers',  sortOrder: 6, parent: 'electronics' },
  { name: 'Accessories',        slug: 'tech-accessories',   description: 'Cables, cases, chargers and more',      sortOrder: 7, parent: 'electronics' },

  // Clothing
  { name: "Men's Clothing",     slug: 'mens-clothing',      description: 'T-shirts, shirts, trousers and jackets',sortOrder: 1, parent: 'clothing-apparel' },
  { name: "Women's Clothing",   slug: 'womens-clothing',    description: 'Dresses, tops, jeans and ethnic wear',  sortOrder: 2, parent: 'clothing-apparel' },
  { name: "Kids' Clothing",     slug: 'kids-clothing',      description: 'Clothing for boys and girls',           sortOrder: 3, parent: 'clothing-apparel' },
  { name: 'Footwear',           slug: 'footwear',           description: 'Sneakers, boots, sandals and formal',   sortOrder: 4, parent: 'clothing-apparel' },
  { name: 'Accessories & Bags', slug: 'accessories-bags',   description: 'Handbags, wallets, belts and sunglasses',sortOrder: 5, parent: 'clothing-apparel' },

  // Home & Kitchen
  { name: 'Furniture',          slug: 'furniture',          description: 'Sofas, beds, tables and storage',       sortOrder: 1, parent: 'home-kitchen' },
  { name: 'Kitchen Appliances', slug: 'kitchen-appliances', description: 'Microwaves, blenders and coffee makers',sortOrder: 2, parent: 'home-kitchen' },
  { name: 'Bedding & Bath',     slug: 'bedding-bath',       description: 'Sheets, towels and pillows',            sortOrder: 3, parent: 'home-kitchen' },
  { name: 'Home Décor',         slug: 'home-decor',         description: 'Lights, wall art and decorative items', sortOrder: 4, parent: 'home-kitchen' },
  { name: 'Cleaning Supplies',  slug: 'cleaning-supplies',  description: 'Vacuum cleaners, mops and detergents',  sortOrder: 5, parent: 'home-kitchen' },

  // Sports & Fitness
  { name: 'Gym Equipment',      slug: 'gym-equipment',      description: 'Dumbbells, barbells and treadmills',    sortOrder: 1, parent: 'sports-fitness' },
  { name: 'Outdoor & Camping',  slug: 'outdoor-camping',    description: 'Tents, backpacks and hiking gear',      sortOrder: 2, parent: 'sports-fitness' },
  { name: 'Sports Apparel',     slug: 'sports-apparel',     description: 'Track suits, jerseys and compression',  sortOrder: 3, parent: 'sports-fitness' },
  { name: 'Cycling',            slug: 'cycling',            description: 'Bikes, helmets and cycling accessories', sortOrder: 4, parent: 'sports-fitness' },
  { name: 'Yoga & Meditation',  slug: 'yoga-meditation',    description: 'Mats, blocks and meditation tools',      sortOrder: 5, parent: 'sports-fitness' },

  // Books & Media
  { name: 'Fiction',            slug: 'fiction',            description: 'Novels, thrillers and literary fiction', sortOrder: 1, parent: 'books-media' },
  { name: 'Non-Fiction',        slug: 'non-fiction',        description: 'Biographies, history and science',       sortOrder: 2, parent: 'books-media' },
  { name: 'Technology Books',   slug: 'technology-books',   description: 'Programming, AI and tech guides',        sortOrder: 3, parent: 'books-media' },
  { name: 'Children\'s Books',  slug: 'childrens-books',    description: 'Picture books and young adult fiction',  sortOrder: 4, parent: 'books-media' },
  { name: 'Music & Movies',     slug: 'music-movies',       description: 'CDs, DVDs, vinyl and streaming cards',   sortOrder: 5, parent: 'books-media' },

  // Beauty
  { name: 'Skincare',           slug: 'skincare',           description: 'Moisturizers, serums and sunscreen',    sortOrder: 1, parent: 'beauty-personal-care' },
  { name: 'Haircare',           slug: 'haircare',           description: 'Shampoos, conditioners and styling',    sortOrder: 2, parent: 'beauty-personal-care' },
  { name: 'Makeup',             slug: 'makeup',             description: 'Foundation, lipstick and eye makeup',   sortOrder: 3, parent: 'beauty-personal-care' },
  { name: 'Fragrances',         slug: 'fragrances',         description: 'Perfumes, body mists and deodorants',   sortOrder: 4, parent: 'beauty-personal-care' },

  // Toys & Games
  { name: 'Action Figures',     slug: 'action-figures',     description: 'Superheroes, anime and collectibles',   sortOrder: 1, parent: 'toys-games' },
  { name: 'Board Games',        slug: 'board-games',        description: 'Family, strategy and party games',      sortOrder: 2, parent: 'toys-games' },
  { name: 'LEGO & Building',    slug: 'lego-building',      description: 'Building blocks and construction sets', sortOrder: 3, parent: 'toys-games' },
  { name: 'Educational Toys',   slug: 'educational-toys',   description: 'STEM kits and learning toys',           sortOrder: 4, parent: 'toys-games' },

  // Food & Groceries
  { name: 'Organic & Natural',  slug: 'organic-natural',    description: 'Certified organic and natural products', sortOrder: 1, parent: 'food-groceries' },
  { name: 'Snacks & Beverages', slug: 'snacks-beverages',   description: 'Chips, juices, energy drinks and more', sortOrder: 2, parent: 'food-groceries' },
  { name: 'Dairy & Eggs',       slug: 'dairy-eggs',         description: 'Milk, cheese, butter and eggs',         sortOrder: 3, parent: 'food-groceries' },
  { name: 'Health Supplements', slug: 'health-supplements', description: 'Vitamins, protein and wellness',        sortOrder: 4, parent: 'food-groceries' },
];

// ─── Sample Products ──────────────────────────────────────────────────────────
// Built after categories are inserted so we can reference their IDs.
function buildProducts(catMap) {
  return [
    // ── Electronics ──────────────────────────────────────────────────────────
    {
      name: 'Apple iPhone 15 Pro — 256GB Natural Titanium',
      slug: 'apple-iphone-15-pro-256gb-natural-titanium',
      description: 'The iPhone 15 Pro features a titanium design, the powerful A17 Pro chip, a customizable Action button, and an improved pro camera system with a 48MP main camera.',
      shortDesc: 'A17 Pro chip, 48MP camera, titanium design',
      price: 999.99, comparePrice: 1099.00, costPrice: 750.00,
      sku: 'IPH-15-PRO-256-TI', stock: 45, lowStockAlert: 5,
      category: catMap['smartphones'],
      tags: ['apple', 'iphone', 'smartphone', 'ios', '5g'],
      images: [{ url: 'https://images.unsplash.com/photo-1696446701796-da61c054624b?w=600', alt: 'iPhone 15 Pro', isPrimary: true }],
      weight: 0.187, isFeatured: true, rating: 4.8, reviewCount: 3210,
      variants: [
        { name: 'Storage', value: '128GB', price: 899.99, stock: 20, sku: 'IPH-15-PRO-128-TI' },
        { name: 'Storage', value: '512GB', price: 1199.99, stock: 15, sku: 'IPH-15-PRO-512-TI' },
      ],
    },
    {
      name: 'Samsung Galaxy S24 Ultra — 512GB Titanium Black',
      slug: 'samsung-galaxy-s24-ultra-512gb',
      description: 'Galaxy S24 Ultra with built-in S Pen, 200MP camera with 100x Space Zoom, Snapdragon 8 Gen 3 processor, and 5000mAh battery.',
      shortDesc: 'S Pen, 200MP camera, 5000mAh battery',
      price: 1199.99, comparePrice: 1299.00, costPrice: 900.00,
      sku: 'SAM-S24U-512-BLK', stock: 32, lowStockAlert: 5,
      category: catMap['smartphones'],
      tags: ['samsung', 'galaxy', 'android', '5g', 's-pen'],
      images: [{ url: 'https://images.unsplash.com/photo-1707226282224-d4fe5db62c4d?w=600', alt: 'Samsung Galaxy S24 Ultra', isPrimary: true }],
      weight: 0.232, isFeatured: true, rating: 4.7, reviewCount: 1850,
    },
    {
      name: 'MacBook Pro 14" M3 Pro — 18GB RAM / 512GB SSD',
      slug: 'macbook-pro-14-m3-pro-18gb-512gb',
      description: 'Supercharged by the M3 Pro chip with up to 18-core CPU, up to 30-core GPU, and up to 36GB of unified memory for demanding workflows.',
      shortDesc: 'M3 Pro chip, 14" Liquid Retina XDR, 18GB RAM',
      price: 1999.00, comparePrice: 2199.00,
      sku: 'MBP-14-M3P-18-512', stock: 18, lowStockAlert: 3,
      category: catMap['laptops'],
      tags: ['apple', 'macbook', 'laptop', 'm3', 'macos'],
      images: [{ url: 'https://images.unsplash.com/photo-1629131726692-1accd0c53ce0?w=600', alt: 'MacBook Pro 14', isPrimary: true }],
      weight: 1.61, isFeatured: true, rating: 4.9, reviewCount: 987,
    },
    {
      name: 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones',
      slug: 'sony-wh1000xm5-wireless-headphones',
      description: 'Industry-leading noise cancellation with Dual Noise Sensor technology, 30-hour battery life, multipoint connection and crystal-clear hands-free calling.',
      shortDesc: '30-hour battery, best-in-class noise cancellation',
      price: 349.99, comparePrice: 399.99,
      sku: 'SONY-WH-XM5-BLK', stock: 75, lowStockAlert: 10,
      category: catMap['audio-headphones'],
      tags: ['sony', 'headphones', 'noise-cancelling', 'wireless', 'bluetooth'],
      images: [{ url: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=600', alt: 'Sony WH-1000XM5', isPrimary: true }],
      weight: 0.25, isFeatured: true, rating: 4.8, reviewCount: 5420,
      variants: [
        { name: 'Color', value: 'Black',  stock: 40, sku: 'SONY-WH-XM5-BLK' },
        { name: 'Color', value: 'Silver', stock: 35, sku: 'SONY-WH-XM5-SLV' },
      ],
    },

    // ── Clothing ─────────────────────────────────────────────────────────────
    {
      name: "Levi's 501 Original Fit Jeans",
      slug: 'levis-501-original-fit-jeans',
      description: "The iconic Levi's 501 jeans in a classic straight fit. Made from 100% cotton denim with a button fly closure.",
      shortDesc: 'Classic straight fit, 100% cotton denim',
      price: 69.99, comparePrice: 89.99,
      sku: 'LEV-501-ORG', stock: 120, lowStockAlert: 15,
      category: catMap['mens-clothing'],
      tags: ["levi's", 'jeans', 'denim', 'mens', 'casual'],
      images: [{ url: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600', alt: "Levi's 501 Jeans", isPrimary: true }],
      weight: 0.6,
      variants: [
        { name: 'Size', value: '30x30', stock: 25, sku: 'LEV-501-30-30' },
        { name: 'Size', value: '32x32', stock: 30, sku: 'LEV-501-32-32' },
        { name: 'Size', value: '34x32', stock: 35, sku: 'LEV-501-34-32' },
        { name: 'Size', value: '36x30', stock: 30, sku: 'LEV-501-36-30' },
      ],
      rating: 4.5, reviewCount: 8900,
    },
    {
      name: "Women's Oversized Cashmere Sweater",
      slug: 'womens-oversized-cashmere-sweater',
      description: 'Ultra-soft 100% cashmere sweater in an oversized relaxed fit. Perfect for layering, available in a range of seasonal colors.',
      shortDesc: '100% cashmere, oversized fit, multiple colors',
      price: 129.99, comparePrice: 179.99,
      sku: 'CSH-OVER-SW', stock: 60, lowStockAlert: 10,
      category: catMap['womens-clothing'],
      tags: ['cashmere', 'sweater', 'womens', 'winter', 'luxury'],
      images: [{ url: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600', alt: 'Cashmere Sweater', isPrimary: true }],
      weight: 0.45, isFeatured: true, rating: 4.7, reviewCount: 2340,
      variants: [
        { name: 'Color', value: 'Cream',   stock: 20, sku: 'CSH-OVER-CRM' },
        { name: 'Color', value: 'Caramel', stock: 25, sku: 'CSH-OVER-CAR' },
        { name: 'Color', value: 'Charcoal',stock: 15, sku: 'CSH-OVER-CHR' },
      ],
    },

    // ── Home & Kitchen ────────────────────────────────────────────────────────
    {
      name: 'Instant Pot Duo 7-in-1 Electric Pressure Cooker — 8 Qt',
      slug: 'instant-pot-duo-7in1-8qt',
      description: 'Replace 7 kitchen appliances: pressure cooker, slow cooker, rice cooker, steamer, sauté pan, yogurt maker and food warmer. Cooks up to 70% faster.',
      shortDesc: '7-in-1 functions, 8-quart capacity, 13 smart programs',
      price: 89.99, comparePrice: 119.99,
      sku: 'IPT-DUO-8QT', stock: 95, lowStockAlert: 15,
      category: catMap['kitchen-appliances'],
      tags: ['instant-pot', 'pressure-cooker', 'kitchen', 'appliance', 'cooking'],
      images: [{ url: 'https://images.unsplash.com/photo-1585515656974-e17dc7536ee8?w=600', alt: 'Instant Pot', isPrimary: true }],
      weight: 5.44, isFeatured: true, rating: 4.7, reviewCount: 12500,
    },
    {
      name: 'Premium Bamboo Cutting Board Set — 3 Piece',
      slug: 'premium-bamboo-cutting-board-set-3pc',
      description: 'Eco-friendly bamboo cutting boards in 3 sizes with juice grooves and handle grip. Naturally antibacterial and harder than maple.',
      shortDesc: 'Eco-bamboo, 3 sizes, juice groove design',
      price: 34.99, comparePrice: 49.99,
      sku: 'BMB-CBOARD-3PC', stock: 200, lowStockAlert: 20,
      category: catMap['kitchen-appliances'],
      tags: ['bamboo', 'cutting-board', 'kitchen', 'eco-friendly'],
      images: [{ url: 'https://images.unsplash.com/photo-1606588260160-0c6a75450168?w=600', alt: 'Bamboo Cutting Board', isPrimary: true }],
      weight: 1.8, rating: 4.6, reviewCount: 3800,
    },

    // ── Sports & Fitness ──────────────────────────────────────────────────────
    {
      name: 'Bowflex SelectTech 552 Adjustable Dumbbells — Pair',
      slug: 'bowflex-selecttech-552-adjustable-dumbbells',
      description: 'Replaces 15 sets of weights. Adjust from 5 to 52.5 lbs in 2.5-lb increments with the turn of a dial. Space-saving and built to last.',
      shortDesc: '5–52.5 lbs, replaces 15 sets, space-saving',
      price: 429.00, comparePrice: 549.00,
      sku: 'BWF-552-PAIR', stock: 30, lowStockAlert: 5,
      category: catMap['gym-equipment'],
      tags: ['dumbbells', 'adjustable', 'bowflex', 'strength', 'home-gym'],
      images: [{ url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600', alt: 'Bowflex Dumbbells', isPrimary: true }],
      weight: 33.0, isFeatured: true, rating: 4.8, reviewCount: 6700,
    },
    {
      name: 'Manduka PRO Yoga Mat — 6mm Extra Thick',
      slug: 'manduka-pro-yoga-mat-6mm',
      description: 'The gold standard of yoga mats. Dense cushioning for joint protection, lifetime guarantee, and a closed-cell surface that repels moisture.',
      shortDesc: '6mm cushion, lifetime guarantee, non-slip surface',
      price: 120.00, comparePrice: 140.00,
      sku: 'MAN-PRO-6MM-BLK', stock: 85, lowStockAlert: 10,
      category: catMap['yoga-meditation'],
      tags: ['yoga', 'mat', 'manduka', 'exercise', 'pilates'],
      images: [{ url: 'https://images.unsplash.com/photo-1601925228008-d3a2f21c5b4e?w=600', alt: 'Manduka Yoga Mat', isPrimary: true }],
      weight: 3.0, rating: 4.9, reviewCount: 4200,
      variants: [
        { name: 'Color', value: 'Black',   stock: 40, sku: 'MAN-PRO-6MM-BLK' },
        { name: 'Color', value: 'Midnight',stock: 25, sku: 'MAN-PRO-6MM-MID' },
        { name: 'Color', value: 'Sage',    stock: 20, sku: 'MAN-PRO-6MM-SAG' },
      ],
    },

    // ── Books ─────────────────────────────────────────────────────────────────
    {
      name: 'Atomic Habits — James Clear',
      slug: 'atomic-habits-james-clear',
      description: 'An Easy & Proven Way to Build Good Habits & Break Bad Ones. Over 10 million copies sold worldwide. Transform your life with tiny changes.',
      shortDesc: '10M+ copies sold, #1 NYT bestseller',
      price: 16.99, comparePrice: 27.00,
      sku: 'BK-ATOMH-HC', stock: 300, lowStockAlert: 30,
      category: catMap['non-fiction'],
      tags: ['self-help', 'habits', 'productivity', 'james-clear', 'bestseller'],
      images: [{ url: 'https://images.unsplash.com/photo-1535398089889-dd807df1dfaa?w=600', alt: 'Atomic Habits Book', isPrimary: true }],
      weight: 0.38, isFeatured: true, rating: 4.9, reviewCount: 22000,
    },
    {
      name: 'Clean Code — Robert C. Martin',
      slug: 'clean-code-robert-martin',
      description: 'A handbook of agile software craftsmanship. Learn to write readable, maintainable and testable code from "Uncle Bob".',
      shortDesc: 'Must-read for every developer, agile craftsmanship',
      price: 39.99, comparePrice: 54.99,
      sku: 'BK-CLNCD-SC', stock: 150, lowStockAlert: 20,
      category: catMap['technology-books'],
      tags: ['programming', 'clean-code', 'software-engineering', 'java', 'agile'],
      images: [{ url: 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=600', alt: 'Clean Code Book', isPrimary: true }],
      weight: 0.56, rating: 4.7, reviewCount: 9800,
    },

    // ── Beauty ────────────────────────────────────────────────────────────────
    {
      name: "CeraVe Moisturizing Cream — 19 oz Tub",
      slug: 'cerave-moisturizing-cream-19oz',
      description: 'Developed with dermatologists. 24-hour moisturization with 3 essential ceramides and hyaluronic acid. Non-comedogenic, fragrance-free.',
      shortDesc: '3 ceramides, hyaluronic acid, dermatologist tested',
      price: 18.99, comparePrice: 24.99,
      sku: 'CRV-MOIST-19OZ', stock: 400, lowStockAlert: 50,
      category: catMap['skincare'],
      tags: ['cerave', 'moisturizer', 'skincare', 'ceramides', 'fragrance-free'],
      images: [{ url: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=600', alt: 'CeraVe Moisturizing Cream', isPrimary: true }],
      weight: 0.54, isFeatured: true, rating: 4.8, reviewCount: 31000,
    },

    // ── Toys & Games ─────────────────────────────────────────────────────────
    {
      name: 'LEGO Technic Ferrari Daytona SP3 — 3778 pcs',
      slug: 'lego-technic-ferrari-daytona-sp3',
      description: 'A highly detailed replica of the Ferrari Daytona SP3 with an opening hood, doors and engine cover, plus the iconic V12 engine with moving pistons.',
      shortDesc: '3778 pieces, authentic Ferrari details, moving engine',
      price: 399.99, comparePrice: 449.99,
      sku: 'LGO-TECH-FERR', stock: 22, lowStockAlert: 3,
      category: catMap['lego-building'],
      tags: ['lego', 'technic', 'ferrari', 'adult', 'collectible'],
      images: [{ url: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=600', alt: 'LEGO Ferrari Daytona', isPrimary: true }],
      weight: 3.7, isFeatured: true, rating: 4.9, reviewCount: 1240,
    },
    {
      name: 'Catan Strategy Board Game',
      slug: 'catan-strategy-board-game',
      description: 'The modern classic settler strategy game for 3-4 players. Collect resources, build settlements and cities, and trade your way to victory.',
      shortDesc: '3-4 players, ages 10+, 60-120 min playtime',
      price: 44.99, comparePrice: 55.00,
      sku: 'CATAN-BASE', stock: 180, lowStockAlert: 20,
      category: catMap['board-games'],
      tags: ['catan', 'board-game', 'strategy', 'family', 'settlers'],
      images: [{ url: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=600', alt: 'Catan Board Game', isPrimary: true }],
      weight: 1.4, rating: 4.8, reviewCount: 18500,
    },

    // ── Food & Groceries ──────────────────────────────────────────────────────
    {
      name: 'Optimum Nutrition Gold Standard 100% Whey Protein — 5 lb',
      slug: 'optimum-nutrition-gold-standard-whey-5lb',
      description: '24g of protein per serving, 5.5g BCAAs, 4g glutamine and glutamic acid. Over 20 flavors. The world\'s best-selling whey protein.',
      shortDesc: '24g protein per serving, 73 servings, 20+ flavors',
      price: 69.99, comparePrice: 89.99,
      sku: 'ON-GOLD-WHY-5LB-DBC', stock: 200, lowStockAlert: 25,
      category: catMap['health-supplements'],
      tags: ['protein', 'whey', 'optimum-nutrition', 'supplements', 'gym'],
      images: [{ url: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=600', alt: 'ON Gold Standard Whey', isPrimary: true }],
      weight: 2.27, isFeatured: true, rating: 4.8, reviewCount: 45000,
      variants: [
        { name: 'Flavor', value: 'Double Rich Chocolate', stock: 80, sku: 'ON-GOLD-WHY-5LB-DBC' },
        { name: 'Flavor', value: 'Vanilla Ice Cream',    stock: 60, sku: 'ON-GOLD-WHY-5LB-VIC' },
        { name: 'Flavor', value: 'Strawberry',           stock: 60, sku: 'ON-GOLD-WHY-5LB-STR' },
      ],
    },
  ];
}

// ─── Main Seed Function ────────────────────────────────────────────────────────
async function seed() {
  console.log('\n🌱  Connecting to MongoDB…');
  await mongoose.connect(
    process.env.MONGO_URI || 'mongodb://localhost:27017/ecommerce_products',
    { maxPoolSize: 5 }
  );
  console.log('✅  Connected\n');

  if (WIPE) {
    await Category.deleteMany({});
    await Product.deleteMany({});
    console.log('🗑️   Wiped existing categories and products\n');
  }

  // ── 1. Insert top-level categories ──────────────────────────────────────────
  console.log('📦  Inserting top-level categories…');
  const topInserted = await Category.insertMany(
    TOP_LEVEL.map(c => ({ ...c, parent: null })),
    { ordered: false }
  ).catch(dedupe);

  const catMap = {};  // slug → ObjectId
  (topInserted?.insertedDocs ?? topInserted ?? []).forEach(c => { catMap[c.slug] = c._id; });

  // Also fetch any that already existed (upsert-style safety net)
  const allTop = await Category.find({ slug: { $in: TOP_LEVEL.map(c => c.slug) } });
  allTop.forEach(c => { catMap[c.slug] = c._id; });

  console.log(`   → ${Object.keys(catMap).length} top-level categories ready`);

  // ── 2. Insert sub-categories ─────────────────────────────────────────────────
  console.log('📂  Inserting sub-categories…');
  const subDocs = SUB_CATEGORIES.map(c => ({
    name:        c.name,
    slug:        c.slug,
    description: c.description,
    sortOrder:   c.sortOrder,
    isActive:    true,
    parent:      catMap[c.parent] ?? null,
  }));

  const subInserted = await Category.insertMany(subDocs, { ordered: false }).catch(dedupe);
  const allSub = await Category.find({ slug: { $in: SUB_CATEGORIES.map(c => c.slug) } });
  allSub.forEach(c => { catMap[c.slug] = c._id; });

  console.log(`   → ${allSub.length} sub-categories ready`);

  // ── 3. Insert products ────────────────────────────────────────────────────────
  console.log('🛍️   Inserting sample products…');
  const products = buildProducts(catMap);
  const prodInserted = await Product.insertMany(products, { ordered: false }).catch(dedupe);

  const inserted = Array.isArray(prodInserted) ? prodInserted.length : (prodInserted?.insertedCount ?? 0);
  console.log(`   → ${inserted} products inserted`);

  // ── 4. Summary ────────────────────────────────────────────────────────────────
  const totalCats  = await Category.countDocuments();
  const totalProds = await Product.countDocuments();
  console.log(`\n✅  Seed complete!`);
  console.log(`   Categories : ${totalCats}`);
  console.log(`   Products   : ${totalProds}\n`);

  await mongoose.disconnect();
  process.exit(0);
}

/** Swallow duplicate-key errors (E11000) so re-runs are safe; re-throw others. */
function dedupe(err) {
  if (err.code === 11000 || err?.writeErrors?.every(e => e.code === 11000)) {
    // partial insert — return whatever got in
    return err.result ?? err.insertedDocs ?? [];
  }
  throw err;
}

seed().catch(err => {
  console.error('\n❌  Seed failed:', err.message);
  process.exit(1);
});
