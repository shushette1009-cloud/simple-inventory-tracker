# Inventory Tracker

A simple, offline inventory tracker for a mini convenience store.
Built with plain HTML, CSS, and JavaScript. No install or server needed.

## How to use

1. Unzip the folder.
2. Double-click `index.html` to open it in your browser.
3. Add products with cost, selling price, opening quantity, and reorder level.
4. Use **Stock movement** to record deliveries (stock in), sales or use (stock out),
   and stocktake counts (set exact count).
5. Click a product to see its movement history.

## Features

- Add, edit, and delete products (name, SKU/barcode, category, cost, price)
- Stock in, stock out (cannot go below zero), and stocktake adjustments
- Full movement history per product
- Low-stock and out-of-stock flags based on each product's reorder level
- Search and filter (show only low or out-of-stock items)
- Summary: product count, total units, stock value at cost, items needing attention
- Export the product list to CSV (opens in Excel or Google Sheets)
- Dark mode follows your device setting

## Notes

- Quantity is changed only through Stock movement, so every change is logged.
  The quantity field is locked while editing a product.
- Data is saved in the browser's localStorage on that computer. Clearing browser
  data erases it, so export CSV backups regularly.
- To change the currency, edit the `money` formatter in `js/app.js` and the ₱ symbol in `index.html`.

## Files

- `index.html`: page structure
- `css/style.css`: styling and dark mode
- `js/app.js`: all logic and storage
