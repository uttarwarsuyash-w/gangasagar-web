Build plan 1




Plan 1: Foundation and Shopping —
Implementation Plan
    For agentic workers: REQUIRED SUB-SKILL: Use superpowers:subagent-driven-
    development (recommended) or superpowers:executing-plans to implement this
    plan task-by-task. Steps use checkbox ( - [ ] ) syntax for tracking.


Goal: A deployed shop where admins add products and stock, customers sign in with
Google, build a cart with correct delivery fees and place orders, and admins confirm, take
payment and move orders to Delivered.

Architecture: Next.js static export on Cloudflare Pages talking straight to Supabase. All
pricing, permissions and order rules live in Postgres functions and row-level security; the
browser only displays. Database code is tested locally in PGlite with small Supabase
stubs, so no secrets are needed during development.

Tech Stack: Node 22, Next.js (latest stable, App Router, output: 'export' ), TypeScript
strict, Tailwind CSS v4, Lucide React, @supabase/supabase-js v2, browser-image-
compression , Vitest + Testing Library, @electric-sql/pglite (database tests),
Playwright (smoke tests). Record exact versions in package.json at install time.

Spec: the Build spec tab of this doc (business facts in the Checklist tab). This plan covers
spec stages 1–2. Plans 2–4 are written after Plan 1 ships (see the end).

Execution: native, chosen by the owners on 6 November 2026. Claude implements every
task in order in one session using superpowers:executing-plans, then one fresh reviewer
checks the whole branch.


## Global Constraints
       Free services only: Cloudflare Pages, Supabase Free, GitHub. No paid APIs. Only
        NEXT_PUBLIC_SUPABASE_URL , NEXT_PUBLIC_SUPABASE_ANON_KEY and
        NEXT_PUBLIC_SITE_URL reach the browser; no secret is ever committed.

        next.config.ts : output: 'export' , trailingSlash: true , images: {
       unoptimized: true } .
       Routes: English under /en/ , Hindi under /hi/ ; / forwards to /en/ (static export
       needs a language segment).
       Login: Google only (Supabase Auth, PKCE). Admin allowlist:
       uttarwarsuyash@gmail.com , lguttarwar1974.11@gmail.com .
       Customers never receive stock quantities. Public stock labels, exact strings:
       Available , Limited Stock , Out of Stock .



                                                                                       Page 1 of 15
Build plan 1




       Order statuses, exact strings: Order Placed , Order Confirmed , Processing ,
        Dispatched , Out for Delivery , Delivered , Cancelled .
       Defaults in site_settings.delivery : nanded_free_min_value 499,
        nanded_light_fee 89, nanded_heavy_fee 49, nanded_heavy_min_g 2000,
        outside_fee 179, quotation_min_g 20000. site_settings.quantities :
        loose_min_g 250, loose_step_g 250, custom_min_g 500.
       Money is numeric(10,2) rupees; weight is integer grams. Totals and fees come only
       from database functions, whose signatures take no amounts.
       No invented content: seed data holds only verified facts (Build spec section 7). No
       sample products, prices or reviews.
       Phones: 9403951524 (main, WhatsApp), 9372188080 (support, WhatsApp),
       9272103080 (Gangadhar ji). WhatsApp links are https://wa.me/91<10 digits>?
       text=<encoded> .
       Brand tokens (from the signboard): brand #B3263A , brand-dark #8F1D2E , brand-
       light #FCEDEF , accent #E0A526 , ink #1F1A17 , paper #FFFDF9 . Font: Mukta (Latin
       and Devanagari) via next/font/google .
       Every dialog closes on its close button, outside click and Escape, traps focus, and
       returns focus on close.


## Review Focus
   1. Empty catalogue at build time: the build succeeds, the shop shows "No products yet",
      product routes build a placeholder page. Test in Task 11.
   2. Stale cart (variant hidden, sold out or repriced since it was added): cart shows the
      current price, flags unavailable lines and blocks checkout until they are removed. Test
       in Task 12.
   3. Pincode typed with spaces or the wrong length ( 431 602 , 43160 ): normalised to 6
       digits or rejected with a message, never silently treated as outside Nanded. Tests in
       Tasks 5 and 13.
   4. Double tap on Place Order on a slow phone: exactly one order. Test in Task 6
      ( client_request_id ) and Task 13.
   5. Missing Hindi text: falls back to English, never blank. Test in Task 8.


## Task 1: Project scaffold
Files: Create gangasagar-web/ with npx create-next-app@latest gangasagar-web --
ts --tailwind --eslint --app --src-dir --import-alias "@/*" ; modify
 next.config.ts ; create vitest.config.ts , src/test/setup.ts , .env.example ,




                                                                                        Page 2 of 15
Build plan 1




 README.md .

Interfaces: Produces the repo layout every later task uses; npm run test runs Vitest,
 npm run build writes out/ .

       Step 1: Write src/__tests__/config.test.ts : import next.config.ts ; assert
        output === 'export' , trailingSlash === true , images.unoptimized === true .
       Step 2: Run npx vitest run src/__tests__/config.test.ts ; expected FAIL.
       Step 3: Set the three config values; add Vitest with jsdom and Testing Library;
       .env.example lists the three public variables with empty values.
       Step 4: Run npx vitest run (PASS) and npm run build (writes out/ ).
       Step 5: Commit chore: scaffold static Next.js site .


## Task 2: Database test harness
Files: Create tests/db/stubs.sql , tests/db/harness.ts , tests/db/harness.test.ts .

Interfaces:

       Produces createTestDb(): Promise<TestDb> , which applies tests/db/stubs.sql ,
       then every file in supabase/migrations/ in filename order, then
        supabase/seed.sql .

        TestDb.as<T>(who: 'anon' | 'service' | { userId: string; email: string },
       fn: (q: <R>(sql: string, params?: unknown[]) => Promise<R[]>) =>
       Promise<T>): Promise<T> runs fn in a transaction with set local role and set
       local request.jwt.claims .
       Fixtures ADMIN = { userId: '00000000-0000-0000-0000-0000000000a1', email:
       'uttarwarsuyash@gmail.com' } , CUSTOMER , CUSTOMER_B with ids ending c1 , c2
       and @example.com emails; createUser(db, who) inserts into auth.users .

Stubs (test-only, never deployed): roles anon , authenticated , service_role ; schema
 auth with users(id uuid primary key, email text, raw_user_meta_data jsonb) ,
 auth.uid() and auth.jwt() reading current_setting('request.jwt.claims',
true) ; schema storage with buckets(id text primary key, public boolean) and
 objects(id uuid, bucket_id text, name text, owner uuid) .

       Step 1: Write tests: as CUSTOMER , select auth.uid() returns the customer id and
       auth.jwt()->>'email' its email; as anon , auth.uid() is null.
       Step 2: Run npx vitest run tests/db/harness.test.ts ; expected FAIL.
       Step 3: Implement stubs and harness. If PGlite lacks a needed Postgres feature, fall
       back to supabase start (Docker) behind the same TestDb interface.
       Step 4: Run; expected PASS.



                                                                                         Page 3 of 15
Build plan 1




       Step 5: Commit test: add PGlite database harness with Supabase stubs .


## Task 3: Core schema and seed
Files: Create supabase/migrations/20261107000100_core.sql , supabase/seed.sql ,
tests/db/core.test.ts .

Interfaces: Produces admins(email text primary key) ; is_admin() returns boolean
(security definer, compares lower(auth.jwt()->>'email') , executable by
 authenticated ); profiles(id uuid primary key references auth.users on delete
cascade, full_name text, phone text, whatsapp text, promo_opt_in boolean
default false, created_at timestamptz) filled by trigger handle_new_user from
 raw_user_meta_data->>'full_name' ; site_settings(key text primary key, value
jsonb not null, updated_at timestamptz) .

Seed: the two admin emails; site_settings keys business (name, tagline, established
2005, address, maps_url, hours 08:00–20:00 daily), contact (phones, WhatsApp
numbers, emails, Instagram URL), delivery and quantities (Global Constraints
values), payment ( upi_id null, upi_qr_url null).

       Step 1: Write tests: is_admin() is true for ADMIN , false for CUSTOMER and anon;
       inserting an auth.users row creates a profile with its full name; CUSTOMER reads and
       updates only their own profile; anon can read site_settings ; CUSTOMER cannot
       update site_settings or read admins ; ADMIN can update site_settings .
       Step 2: Run npx vitest run tests/db/core.test.ts ; expected FAIL.
       Step 3: Write the migration (tables, RLS on every table, grants, trigger) and seed.
       Step 4: Run; expected PASS.
       Step 5: Commit feat(db): core schema, admin check, settings seed .


## Task 4: Catalogue, stock and image storage
Files: Create supabase/migrations/20261107000200_catalog.sql ,
 supabase/migrations/20261107000250_storage.sql , tests/db/catalog.test.ts .

Interfaces:

        categories(id, slug unique, parent_id, name_en, name_hi, image_url, sort,
       is_active) .
        products(id, slug unique, category_id, brand, name_en, name_hi,
       description_en, description_hi, images text[], seo_title_en, seo_title_hi,
       seo_description_en, seo_description_hi, is_active, created_at,
       updated_at) .




                                                                                         Page 4 of 15
Build plan 1




        variants(id, product_id, label_en, label_hi, net_weight_g int > 0,
       pack_type, retail_price numeric(10,2) > 0, mrp, sale_price, sale_ends_at,
       is_loose, loose_min_g, loose_step_g, stock_qty numeric(12,3) default 0,
       stock_unit in ('packs','kg'), min_stock, limited_below, is_active, sort) .
       Loose variants: retail_price is per kg, net_weight_g = 1000, stock_unit = 'kg'.
        stock_movements(id, variant_id, kind in
       ('incoming','sale','damaged','expired','adjustment','cancellation_return')
       , qty numeric signed, note, order_id, created_by, created_at) .
       View variant_public : active variants of active products only; columns id,
       product_id, label_en, label_hi, net_weight_g, pack_type, price (sale price
       while sale_ends_at > now() , else retail), mrp, retail_price, sale_ends_at,
       is_loose, loose_min_g, loose_step_g, stock_label . Granted to anon and
        authenticated . variants itself: no anon grant; authenticated only through an
        is_admin() policy.

        admin_adjust_stock(p_variant uuid, p_kind text, p_qty numeric, p_note
       text) returns numeric (new quantity). Kinds: incoming adds, damaged / expired
       subtract, adjustment is signed; sale and cancellation_return are refused. Errors:
        not_allowed , insufficient_stock , invalid_kind .
       Storage bucket public-images (public read; insert, update and delete only when
        is_admin() ).
       Step 1: Write tests:
               anon select stock_qty from variants raises permission denied;
               stock_label : quantity 0 → Out of Stock ; 3 with limited_below 5 → Limited
               Stock ; 5 with limited_below 5 → Available ;
               inactive product's variants are absent from variant_public ;
               price equals sale_price while the sale is running and retail_price after
               sale_ends_at ;
               CUSTOMER insert into products fails and ADMIN succeeds;

               admin_adjust_stock : incoming 10 → 10 with one movement row; damaged 3 → 7;
               damaged 20 → insufficient_stock with quantity unchanged; CUSTOMER call →
               not_allowed ; kind sale → invalid_kind ;
               storage: ADMIN can insert into storage.objects for public-images , CUSTOMER
               cannot.
       Step 2: Run npx vitest run tests/db/catalog.test.ts ; expected FAIL.
       Step 3: Write both migrations.
       Step 4: Run; expected PASS.




                                                                                     Page 5 of 15
Build plan 1




       Step 5: Commit feat(db): catalogue, stock movements, public variant view,
       image bucket .


## Task 5: Delivery areas and cart pricing
Files: Create supabase/migrations/20261107000300_pricing.sql ,
 tests/db/pricing.test.ts .

Interfaces:

        delivery_areas(pincode char(6), area text, is_nanded boolean default
       true, primary key (pincode, area)) ; anon read, admin write.
        normalize_pincode(text) returns text : strip non-digits; return null unless exactly
       6 digits.
        price_cart(p_items jsonb, p_pincode text, p_fulfilment text) returns
       jsonb (security definer, stable). Items: {"variant_id": uuid, "qty": int} for
       packs, {"variant_id": uuid, "grams": int} for loose. Fulfilment: pickup ,
       delivery (Nanded only), courier or transport (outside only). Pickup needs no
       pincode and costs 0.
       Returns { lines: [{ variant_id, name_en, name_hi, label_en, label_hi, qty,
       grams, unit_price, line_total, weight_g, stock_label }], weight_g,
       subtotal, zone: 'nanded' | 'outside' | null, delivery_fee, total,
       requires_quotation, errors: [{ code, variant_id? }] } . Error codes:
        empty_cart , invalid_pincode , unavailable , invalid_quantity ,
        invalid_fulfilment .
       Rules read from site_settings : weight ≥ quotation_min_g → requires_quotation
       true, fee and total null. Nanded delivery: subtotal ≥ 499 → 0; else weight < 2000 → 89;
       else 49. Outside: 179. Loose line total = price per kg × grams / 1000, rounded to 2
       decimals.
       Step 1: Write a table-driven test with fixture pincode 431602 (Gokul Nagar) in
        delivery_areas :




                                                                                         Page 6 of 15
Build plan 1




   const cases = [
     ['1999 g, ₹300, delivery',       { g: 1999,   value: 300, pin: '431602', f:
   'delivery' }, { fee: 89 }],
     ['2000 g, ₹300, delivery',       { g: 2000,   value: 300, pin: '431602', f:
   'delivery' }, { fee: 49 }],
     ['1500 g, ₹499, delivery',       { g: 1500,   value: 499, pin: '431602', f:
   'delivery' }, { fee: 0 }],
     ['1500 g, ₹498.99',              { g: 1500,   value: 498.99, pin: '431602', f:
   'delivery' }, { fee: 89 }],
     ['pickup',                       { g: 500,     value: 100, pin: null, f:
   'pickup' },   { fee: 0 }],
     ['outside 19999 g',              { g: 19999, value: 900, pin: '411001', f:
   'courier' }, { fee: 179, zone: 'outside' }],
     ['20000 g any zone',          { g: 20000, value: 900, pin: '431602', f:
   'delivery' }, { requires_quotation: true, total: null }],
     ['spaces in pincode',         { g: 500,   value: 100, pin: '431 602', f:
   'delivery' }, { zone: 'nanded' }],
     ['short pincode',             { g: 500,        value: 100, pin: '43160', f:
   'delivery' }, { error: 'invalid_pincode' }],
     ['delivery outside Nanded',   { g: 500,    value: 100, pin: '411001', f:
   'delivery' }, { error: 'invalid_fulfilment' }],
   ] as const;


Also test: loose 300 g with step 250 → invalid_quantity ; loose 250 g at ₹200/kg → line
total 50.00 and weight 250; inactive variant → unavailable ; a running sale price is used;
empty items → empty_cart .

       Step 2: Run npx vitest run tests/db/pricing.test.ts ; expected FAIL.
       Step 3: Write the migration.
       Step 4: Run; expected PASS.
       Step 5: Commit feat(db): delivery areas and server-side cart pricing .


## Task 6: Orders
Files: Create supabase/migrations/20261107000400_orders.sql ,
 tests/db/orders.test.ts .

Interfaces:

        orders(id, number unique, user_id, client_request_id uuid, unique
       (user_id, client_request_id), status, zone, fulfilment, address jsonb,
       pincode, weight_g, subtotal, delivery_fee, total, payment_method in
       ('cash','upi_on_delivery','upi_prepaid'), payment_status in




                                                                                     Page 7 of 15
Build plan 1




       ('unpaid','submitted','paid') default 'unpaid', upi_reference,
       customer_note, invoice_number, created_at, confirmed_at, delivered_at) .
       Number: GKS- + YYMM (Asia/Kolkata) + - + 5-digit sequence.
        order_items(id, order_id, variant_id, product_name_en, product_name_hi,
       label_en, label_hi, qty, grams, unit_price, line_total, weight_g) ;
        order_status_history(id, order_id, status, changed_by, note, created_at) .
        place_order(p_client_request_id uuid, p_items jsonb, p_pincode text,
       p_fulfilment text, p_payment_method text, p_address jsonb, p_note text)
       returns uuid . Requires sign-in; repeats with the same client_request_id return
       the first order's id; uses price_cart ; outside zone allows only upi_prepaid , Nanded
       and pickup allow cash or upi_on_delivery ; address ( name , 10-digit phone , line1 ,
        city ) required unless pickup. Errors: not_signed_in , quotation_required ,
        invalid_payment_method , invalid_address , plus any price_cart error code.
        admin_confirm_order(p_order uuid) : from Order Placed only; locks variants for
       update ; deducts packs or kg; writes sale movements; error insufficient_stock
       changes nothing.
        submit_payment_reference(p_order uuid, p_reference text) : owner only,
       outside zone, status Order Confirmed , reference 6–30 letters or digits; sets
        submitted .

        admin_record_payment(p_order uuid, p_reference text) : sets paid .
        admin_set_order_status(p_order uuid, p_status text, p_note text) : forward
       only through Confirmed → Processing → Dispatched → Out for Delivery → Delivered;
       pickup may go Processing → Delivered; outside orders need paid before Processing
       ( payment_required ); Delivered sets delivered_at and invoice_number ( INV-
       YYMM- + 5 digits). Errors: invalid_transition , not_allowed .
       Customers read only their own orders, items and history; no direct writes. Every
       status change writes history.
       Step 1: Write tests: anon place_order → not_signed_in ; Nanded order total equals
        price_cart total, status Order Placed , one history row; same client_request_id
       twice → same id and one row; 20 kg → quotation_required ; outside with cash →
        invalid_payment_method ; CUSTOMER_B cannot read CUSTOMER 's order; confirm
       deducts stock and writes sale movements; insufficient stock → error and stock
       unchanged; outside order to Processing before payment → payment_required , then
       works after submit_payment_reference and admin_record_payment ; Placed →
       Delivered → invalid_transition ; Delivered sets an invoice number; CUSTOMER
       calling any admin_ function → not_allowed .
       Step 2: Run npx vitest run tests/db/orders.test.ts ; expected FAIL.
       Step 3: Write the migration.



                                                                                       Page 8 of 15
Build plan 1




       Step 4: Run; expected PASS.
       Step 5: Commit feat(db): orders, confirmation, payment and status flow .


## Task 7: Supabase client and Google sign-in
Files: Create src/lib/supabase/client.ts , src/lib/auth/session.tsx ,
src/lib/auth/admin.ts , src/components/auth/SignInButton.tsx ,
 src/components/auth/RequireSignIn.tsx , src/components/admin/AdminGuard.tsx ,
 src/app/[lang]/auth/callback/page.tsx , tests beside each.

Interfaces: getSupabase(): SupabaseClient (singleton, flowType: 'pkce' ,
 detectSessionInUrl: true ); SessionProvider and useSession(): { user: User |
null; loading: boolean } ; useIsAdmin(): boolean | null (calls rpc('is_admin') );
 signInWithGoogle(next: string): Promise<void> with redirectTo
 ${NEXT_PUBLIC_SITE_URL}/<lang>/auth/callback/?next=<encoded> .

       Step 1: Write tests with getSupabase mocked:
        signInWithGoogle('/en/checkout/') calls signInWithOAuth({ provider:
       'google', options: { redirectTo:
       'https://example.pages.dev/en/auth/callback/?next=%2Fen%2Fcheckout%2F' }
       }) ; AdminGuard shows the dictionary text for "admins only" when the RPC returns
       false, its children when true, and a spinner while null; RequireSignIn shows a Google
       sign-in prompt with no user.
       Step 2: Run npx vitest run src/lib src/components/auth
       src/components/admin ; expected FAIL.
       Step 3: Implement. The callback page waits for the session, then
       router.replace(next) , defaulting to /<lang>/ .
       Step 4: Run; expected PASS.
       Step 5: Commit feat: Google sign-in and admin guard .


## Task 8: Layout, languages and theme
Files: Create src/app/[lang]/layout.tsx (root layout, <html lang> ,
generateStaticParams → en , hi ), src/app/[lang]/page.tsx (simple home: name,
tagline, Shop / Call / WhatsApp / Directions buttons), src/i18n/dictionaries/en.ts ,
 hi.ts , src/i18n/get-dictionary.ts , src/i18n/localized.ts ,
 src/components/layout/Header.tsx , Footer.tsx , LanguageSwitcher.tsx ,
 public/_redirects ( / /en/ 301 ), public/index.html (meta refresh to /en/ ); modify
 src/app/globals.css (brand tokens via @theme , Mukta font); delete the scaffold's
src/app/layout.tsx and src/app/page.tsx.




                                                                                      Page 9 of 15
Build plan 1




Interfaces: type Lang = 'en' | 'hi' ; getDictionary(lang: Lang): Dictionary
where Dictionary is the type of en.ts ; pick(row: Record<string, unknown>, field:
string, lang: Lang): string ; switchPath(pathname: string, to: Lang): string .

       Step 1: Write tests: pick returns English when the Hindi value is null, empty or
       whitespace; switchPath('/en/shop/peanuts/', 'hi') === '/hi/shop/peanuts/'
       and switchPath('/hi/', 'en') === '/en/' ; every key of en exists in hi (the
       failure message lists missing keys); the header's links all start with the current
       language prefix; the footer's Call link is tel:+919403951524 .
       Step 2: Run npx vitest run src/i18n src/components/layout ; expected FAIL.
       Step 3: Implement. Hindi strings are first drafts, marked for the owners' Hindi
       reviewer.
       Step 4: Run; expected PASS; npm run build writes out/en/index.html and
        out/hi/index.html .
       Step 5: Commit feat: language routing, layout and brand theme .


## Task 9: Admin catalogue
Files: Create src/app/[lang]/admin/layout.tsx (AdminGuard + sidebar),
 admin/page.tsx (counts: active products, orders in Order Placed , variants below
minimum stock), admin/products/page.tsx , admin/products/edit/page.tsx ( ?id= ;
none means new), admin/categories/page.tsx , src/features/catalog/admin-api.ts ,
 src/features/catalog/validation.ts , src/lib/images/upload.ts ,
 src/components/ui/ConfirmDialog.tsx , src/components/ui/Toast.tsx , tests beside
each.

Interfaces: listProducts() , getProduct(id) , saveProduct(input: ProductInput):
Promise<string> , saveVariant(input: VariantInput): Promise<string> ,
 deleteProduct(id) , deleteVariant(id) , listCategories() , saveCategory(input:
CategoryInput) ; validateProduct(input): Record<string, string> ,
 validateVariant(input): Record<string, string> ; uploadImage(file: File,
folder: 'products' | 'categories' | 'gallery' | 'site'): Promise<{ large:
string; thumb: string }> (WebP, 1600 px and 600 px, bucket public-images ).

       Step 1: Write tests: slug must match ^[a-z0-9]+(-[a-z0-9]+)*$ ; name_en required;
       net weight a positive integer; retail price above 0; sale price below retail price; loose
       variants need step > 0, minimum ≥ step and minimum divisible by step; uploadImage
       compresses twice with maxWidthOrHeight 1600 and 600 and fileType:
       'image/webp' ; ConfirmDialog closes on Escape and outside click and returns focus;
       deleting a product asks for confirmation first.




                                                                                            Page 10 of 15
Build plan 1




       Step 2: Run npx vitest run src/features/catalog src/lib/images
       src/components/ui ; expected FAIL.
       Step 3: Implement. Every save shows a success or error toast.
       Step 4: Run; expected PASS.
       Step 5: Commit feat(admin): products, variants, categories and image
       upload .


## Task 10: Admin inventory
Files: Create src/app/[lang]/admin/inventory/page.tsx ,
 src/features/inventory/api.ts , src/features/inventory/StockTable.tsx ,
 AdjustStockDialog.tsx , tests.

Interfaces: listStock(): Promise<StockRow[]> with { variantId, productName,
label, stockQty, stockUnit, minStock, limitedBelow } ; adjustStock(variantId:
string, kind: 'incoming' | 'damaged' | 'expired' | 'adjustment', qty: number,
note: string): Promise<number> (calls admin_adjust_stock );
 listMovements(variantId: string) .

       Step 1: Write tests: the dialog keeps Save disabled for quantity ≤ 0 except for
       adjustment ; it sends the typed quantity and kind unchanged; the "Low stock" filter
       shows only rows with stockQty < minStock ; an insufficient_stock error shows a
       readable message.
       Step 2: Run npx vitest run src/features/inventory ; expected FAIL.
       Step 3: Implement.
       Step 4: Run; expected PASS.
       Step 5: Commit feat(admin): inventory and stock movements .


## Task 11: Shop and product pages
Files: Create src/features/catalog/public-api.ts , src/features/catalog/live.ts ,
 src/features/catalog/search.ts , src/app/[lang]/shop/page.tsx ,
 shop/[category]/page.tsx , product/[slug]/page.tsx ,
 src/components/shop/ProductCard.tsx , VariantPicker.tsx , AddToCartButton.tsx ,
 WhatsAppEnquiryButton.tsx , tests.

Interfaces: fetchCatalog(): Promise<Catalog> (build time, anon key, active categories,
products and variant_public ); useLiveVariants(productIds: string[]) (client,
fresh price and label); filterProducts(products, { query, categorySlug, brand,
availability, loose }) ; buildProductEnquiryLink(name: string, url: string,




                                                                                    Page 11 of 15
Build plan 1




lang: Lang): string (to 9403951524). generateStaticParams returns [{ slug: '_'
}] (and [{ category: '_' }] ) when the catalogue is empty; that page shows "not
found".

       Step 1: Write tests: search matches Hindi name and brand, ignores case and extra
       spaces; with an empty catalogue the shop shows the "No products yet" text and
        generateStaticParams returns the placeholder; the loose picker starts at 250 g, +
       gives 500 g, − at 250 g stays 250 g; the enquiry link starts with
        https://wa.me/919403951524?text= and contains the encoded product name and
       URL; product cards never render a stock number.
       Step 2: Run npx vitest run src/features/catalog src/components/shop ;
       expected FAIL.
       Step 3: Implement.
       Step 4: Run; expected PASS; npm run build succeeds with an empty catalogue.
       Step 5: Commit feat: shop, search and product pages .


## Task 12: Cart
Files: Create src/features/cart/store.ts , src/features/cart/pricing.ts ,
 src/app/[lang]/cart/page.tsx , src/components/cart/CartLines.tsx ,
 DeliveryNotice.tsx , tests.

Interfaces: useCart() → { items: CartItem[]; add(item); setQuantity(variantId,
value); remove(variantId); clear() } where CartItem = { variantId: string;
qty?: number; grams?: number } , saved in localStorage key gks-cart-v1 ;
 priceCart(items, pincode: string | null, fulfilment): Promise<CartPrice>
(wraps price_cart ); buildQuotationWhatsAppLink(lines, lang): string (until Plan 2
adds the quotation form).

       Step 1: Write tests: adding the same variant twice merges; the cart survives reload;
       corrupted storage gives an empty cart, not a crash; a line returned as unavailable
       shows "No longer available" and disables Checkout until removed; a repriced line
       shows the new price; notices: 1.5 kg and ₹300 → both the 2 kg hint and the ₹499 hint;
       2.5 kg and ₹300 → only the ₹499 hint; 20 kg → quotation notice with the WhatsApp
       quotation link instead of Checkout.
       Step 2: Run npx vitest run src/features/cart src/components/cart ; expected
       FAIL.
       Step 3: Implement. Delivery fee appears once a pincode is entered or pickup is
       chosen.
       Step 4: Run; expected PASS.
       Step 5: Commit feat: cart with live weight and delivery fee .



                                                                                        Page 12 of 15
Build plan 1




## Task 13: Checkout and customer order page
Files: Create src/app/[lang]/checkout/page.tsx ,
 src/features/checkout/validation.ts , src/features/orders/api.ts ,
 src/app/[lang]/account/order/page.tsx ( ?id= ), tests.

Interfaces: validateAddress(a: AddressInput): { errors: Record<string, string>;
value: AddressInput } (phone: strip +91 , spaces and dashes, then ^[6-9]\d{9}$ ;
pincode via the same 6-digit rule); placeOrder(input: PlaceOrderInput):
Promise<string> (one client_request_id per checkout, kept in sessionStorage and
reused on retry); getMyOrder(id) ; submitPaymentReference(id, reference) .

       Step 1: Write tests: +91 94039 51524 → 9403951524 ; 12345 invalid; 431 602 →
        431602 ; Place Order is disabled while submitting and a double click calls placeOrder
       once; a retry after a network error reuses the same client_request_id ; outside
       zone offers only "UPI after we confirm"; Nanded offers cash or UPI at delivery or
       pickup; the order page shows the UPI box (UPI ID and QR from settings, reference
       form) only when zone is outside, status is Order Confirmed and payment is unpaid .
       Step 2: Run npx vitest run src/features/checkout src/features/orders
       src/app ; expected FAIL.
       Step 3: Implement. Checkout requires sign-in; after success the customer lands on
       their order page.
       Step 4: Run; expected PASS.
       Step 5: Commit feat: checkout and order tracking page .


## Task 14: Admin orders and WhatsApp updates
Files: Create src/app/[lang]/admin/orders/page.tsx , admin/orders/view/page.tsx
( ?id= ), src/features/orders/admin-api.ts , src/lib/whatsapp.ts ,
 src/components/admin/OrderStatusActions.tsx , tests.

Interfaces: listOrders(filter: { status?: string; zone?: string; from?: string;
to?: string; search?: string }) , getOrder(id) , confirmOrder(id) ,
 recordPayment(id, reference) , setOrderStatus(id, status, note) ; waLink(phone:
string, text: string): string ; statusMessage(order: { number: string; total:
number }, status: string, lang: Lang): string .

       Step 1: Write tests: waLink('+91 94039 51524', 'Hi there') ===
       'https://wa.me/919403951524?text=Hi%20there' ; statusMessage includes the
       order number and status in English and Hindi; for a pickup order in Processing the
       actions offer Delivered; for an unpaid outside order in Order Confirmed, Processing is
       hidden and "Waiting for payment" shows; errors like insufficient_stock show
       readable messages.


                                                                                      Page 13 of 15
Build plan 1




       Step 2: Run npx vitest run src/lib/whatsapp.test.ts src/features/orders
       src/components/admin ; expected FAIL.
       Step 3: Implement.
       Step 4: Run; expected PASS.
       Step 5: Commit feat(admin): order handling with one-tap WhatsApp updates .


## Task 15: Setup guides, smoke tests and deployment
Files: Create scripts/combine-migrations.mjs (writes supabase/apply-all.sql :
migrations in order, then seed), docs/setup/01-supabase.md , 02-google-login.md , 03-
cloudflare-pages.md , 04-first-admin-steps.md , playwright.config.ts (projects:
phone 390×844, desktop 1280×800), e2e/smoke.spec.ts , e2e/fixtures/*.json .

Guides (owners do every step in their own accounts; secrets go only into Supabase,
Google Cloud or Cloudflare settings): create the Supabase project in the Mumbai region
and run apply-all.sql in the SQL editor; enable the Google provider; set Site URL and
redirect URLs ( /en/auth/callback/ , /hi/auth/callback/ ) on the pages.dev address;
create the Cloudflare Pages project from GitHub (build npm run build , output out , the
three public variables, NODE_VERSION 22); then in the admin add Nanded pincodes, the
UPI ID and QR, categories and first products.

       Step 1: Write smoke tests against npx serve out with Supabase calls answered from
       fixtures: / reaches /en/ ; every header link returns a page; the language switch
       keeps the same page; add to cart updates the cart count; the cart shows ₹89 for the
       1.5 kg / ₹300 fixture; dialogs close with Escape; no console errors on any visited page,
       at both sizes.
       Step 2: Run npx playwright test ; expected FAIL until fixtures and pages line up.
       Step 3: Implement the script, guides and fixes.
       Step 4: Run npx vitest run && npm run build && npx playwright test ;
       expected all PASS.
       Step 5: Commit chore: setup guides, smoke tests, deployment config ; push;
       deploy.

## Owner acceptance (real Google login, on a phone): admin adds a category, a product
with two variants, stock and the UPI ID; redeploy; a customer adds items, enters 431602
and sees ₹89, ₹49 and free delivery at the right weights and values, and places an order;
the admin confirms it, records payment, moves it to Delivered and sends the WhatsApp
update.




                                                                                        Page 14 of 15
Build plan 1




## Later plans
       Plan 2, accounts and quotations: profile and saved addresses, order history,
       cancellation requests with the Cancelled status and stock return, quotations end to
       end, wishlist, reviews with moderation, PDF invoices, reorder, custom-quantity
       enquiries.
       Plan 3, content: full home page, Our Journey, Owners and Leadership, gallery with
       lightbox, offers, news and blog, FAQ and help bot, contact form and enquiries, support
       pop-up, policy pages, admin content and settings editors.
       Plan 4, finishing and launch: Hindi review, SEO (metadata, structured data, sitemap,
       robots, hreflang), admin overview statistics and Excel/PDF reports, Publish button
       (Edge Function + Cloudflare deploy hook), nightly backup workflow, full test pass,
       Google Search Console.




                                                                                      Page 15 of 15
