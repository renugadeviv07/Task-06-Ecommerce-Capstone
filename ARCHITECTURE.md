# ShopSmart Architecture

```mermaid
flowchart TD
    U[Customer / Admin] --> UI[Browser UI - index.html]
    UI --> APP[app.js - application logic and DOM]
    APP --> API[api.js - REST client]
    API --> REST[FakeStoreAPI]
    APP --> STORE[store.js - LocalStorage helpers]
    STORE --> LS[(Browser LocalStorage)]
    APP --> SHOP[Catalogue and filters]
    APP --> CART[Cart and checkout simulation]
    APP --> ADMIN[Admin product CRUD]
    APP --> ORDERS[Order history]
```

## Data flow

1. `app.js` calls `fetchProducts()` during initialization.
2. `api.js` checks the time-limited LocalStorage cache before calling FakeStoreAPI with `fetch` and `async/await`.
3. The application renders product data and derives filtered/sorted results from the current UI state.
4. `store.js` centralizes persistence for the cart, demo users, session, orders and locally managed products.
5. The admin workspace changes only locally managed product data. It does not write to FakeStoreAPI.
