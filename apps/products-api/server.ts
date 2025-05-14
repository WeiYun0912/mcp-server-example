import express from "express";
import cors from "cors";

import guitars from "./example-guitars";

const PORT = process.env.PORT || 8082;

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static("images"));


interface InventoryItem {
  guitarId: number;
  quantity: number;
}

interface Order {
  id: number;
  customerName: string;
  items: Array<{
    guitarId: number;
    quantity: number;
  }>;
  totalAmount: number;
  orderDate: string;
}

interface Guitar {
  id: number;
  name: string;
  image: string;
  description: string;
  shortDescription: string;
  price: number;
}

async function fetchState(): Promise<{
  inventory: InventoryItem[];
  orders: Order[];
  guitars: Guitar[];
}> {
  let inventory: InventoryItem[] = [];
  let orders: Order[] = [];
  let guitars: Guitar[] = [];

  if (inventory.length === 0) {
    const guitarsReq = await fetch("http://localhost:8082/products");
    guitars = await guitarsReq.json();

    inventory = guitars.map((guitar: Guitar) => ({
      guitarId: guitar.id,
      quantity: Math.floor(Math.random() * 10) + 5,
    }));

    orders = [
      {
        id: 2,
        customerName: "Jane Doe",
        items: [{ guitarId: 3, quantity: 3 }],
        totalAmount: 2500,
        orderDate: "2025-03-12",
      },
      {
        id: 3,
        customerName: "Bob Smith",
        items: [
          { guitarId: 1, quantity: 1 },
          { guitarId: 2, quantity: 2 },
        ],
        totalAmount: 2200,
        orderDate: "2025-02-14",
      },
      {
        id: 5,
        customerName: "Mike Brown",
        items: [
          { guitarId: 5, quantity: 2 },
          { guitarId: 6, quantity: 1 },
        ],
        totalAmount: 1800,
        orderDate: "2025-02-19",
      },
      {
        id: 4,
        customerName: "Alice Johnson",
        items: [{ guitarId: 4, quantity: 1 }],
        totalAmount: 1500,
        orderDate: "2025-01-19",
      },
      {
        id: 1,
        customerName: "John Doe",
        items: [
          { guitarId: 1, quantity: 2 },
          { guitarId: 2, quantity: 1 },
        ],
        totalAmount: 1200,
        orderDate: "2025-01-17",
      },
    ];
  }

  return { inventory, orders, guitars };
}

let state: Awaited<ReturnType<typeof fetchState>> | null = null;
const getState = async () => {
  if (!state) {
    state = await fetchState();
  }
  return state;
};


app.get("/products", (req, res) => {
  res.json(
    guitars.map((guitar) => ({
      ...guitar,
      image: `${req.protocol}://${req.get("host")}${guitar.image}`,
    }))
  );
});

app.get("/inventory", async (req, res) => {
  const { inventory, orders, guitars } = await getState();
  const inventoryWithDetails = inventory.map((item) => {
    const guitar = guitars.find((g: Guitar) => g.id === item.guitarId);
    return {
      ...item,
      guitar,
    };
  });
  res.json(inventoryWithDetails);
});

app.listen(PORT, () => {
  console.log(
    `Products API Server is running on port http://localhost:${PORT}`
  );
});
