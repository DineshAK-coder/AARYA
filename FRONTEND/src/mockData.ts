import { BusinessState } from "./types";

export const initialBusinessState: BusinessState = {
  businessName: "Surinder Trades & Consulting",
  industry: "Consulting & Services",
  currency: "USD ($)",
  currencySymbol: "$",
  startingBalance: 15254.37,
  ledger: [
    {
      id: "led_1",
      name: "Surinder Thakur",
      amount: 8720.76,
      overdue: true,
      dueDate: "2026-06-15",
      email: "surinder.th@outlook.com",
      phone: "+1 415-829-1038",
      initials: "ST",
    },
    {
      id: "led_2",
      name: "Acme Corporation",
      amount: 1200.00,
      overdue: false,
      dueDate: "2026-07-10",
      email: "finance@acme.co",
      phone: "+1 415-992-0031",
      initials: "AC",
    },
    {
      id: "led_3",
      name: "Freelan Tech Labs",
      amount: 4321.00,
      overdue: false,
      dueDate: "2026-07-28",
      email: "billing@freelantech.com",
      phone: "+1 650-881-2292",
      initials: "FT",
    },
    {
      id: "led_4",
      name: "Global Supplies Group",
      amount: -2450.00, // credit we owe them
      overdue: false,
      dueDate: "2026-08-01",
      email: "support@globalsupplies.com",
      phone: "+1 312-990-8812",
      initials: "GS",
    }
  ],
  invoices: [
    {
      id: "INV-1041",
      customer: "Surinder Thakur",
      customerId: "led_1",
      amount: 8720.76,
      status: "Overdue",
      date: "2026-06-01",
      dueDate: "2026-06-15",
      lineItems: [
        { id: "li_1", description: "Financial Systems Audit", qty: 1, price: 5000.00 },
        { id: "li_2", description: "Tax Compliance Implementation", qty: 1, price: 3720.76 }
      ]
    },
    {
      id: "INV-1042",
      customer: "Acme Corporation",
      customerId: "led_2",
      amount: 1200.00,
      status: "Pending",
      date: "2026-06-10",
      dueDate: "2026-07-10",
      lineItems: [
        { id: "li_3", description: "Monthly CFO Advisory", qty: 1, price: 1200.00 }
      ]
    },
    {
      id: "INV-1043",
      customer: "Freelan Tech Labs",
      customerId: "led_3",
      amount: 4321.00,
      status: "Pending",
      date: "2026-06-28",
      dueDate: "2026-07-28",
      lineItems: [
        { id: "li_4", description: "Enterprise Scalability Consulting", qty: 1, price: 4321.00 }
      ]
    },
    {
      id: "INV-1040",
      customer: "Surinder Thakur",
      customerId: "led_1",
      amount: 1500.00,
      status: "Paid",
      date: "2026-05-01",
      dueDate: "2026-05-15",
      lineItems: [
        { id: "li_5", description: "Strategic Cash Flow Consultation", qty: 1, price: 1500.00 }
      ]
    },
    {
      id: "INV-1039",
      customer: "Acme Corporation",
      customerId: "led_2",
      amount: 3450.00,
      status: "Paid",
      date: "2026-05-05",
      dueDate: "2026-06-05",
      lineItems: [
        { id: "li_6", description: "Bookkeeping & Compliance Sync", qty: 1, price: 3450.00 }
      ]
    }
  ],
  activities: [
    {
      id: "act_1",
      timestamp: "2026-07-02 14:30",
      actionType: "ledger",
      customer: "Surinder Thakur",
      description: "Automated billing email reminder dispatched",
      amount: 8720.76,
    },
    {
      id: "act_2",
      timestamp: "2026-06-28 09:15",
      actionType: "billing",
      customer: "Freelan Tech Labs",
      description: "Created and finalized Invoice #INV-1043",
      amount: 4321.00,
    },
    {
      id: "act_3",
      timestamp: "2026-06-10 11:45",
      actionType: "billing",
      customer: "Acme Corporation",
      description: "Created Invoice #INV-1042 for monthly advisory",
      amount: 1200.00,
    },
    {
      id: "act_4",
      timestamp: "2026-06-05 16:20",
      actionType: "billing",
      customer: "Acme Corporation",
      description: "Received payment for Invoice #INV-1039",
      amount: 3450.00,
    },
    {
      id: "act_5",
      timestamp: "2026-05-15 10:00",
      actionType: "ledger",
      customer: "Surinder Thakur",
      description: "Marked Invoice #INV-1040 as Paid",
      amount: 1500.00,
    }
  ],
  chatHistory: [
    {
      id: "msg_1",
      sender: "agent",
      text: "Hello! I am A.A.R.Y.A, your virtual AI CFO. I have connected to your financial ledger and parsed your recent accounts. Your starting liquidity is $15,254.37. \n\nHow can I help you optimize your business cash cycle today? You can ask me: 'Who owes me money?' or 'Why is cash flow down?'",
      timestamp: "2026-07-03 11:30"
    }
  ],
  onboarded: true,
  loggedIn: true,
  userEmail: "ponnarasuperumal05@gmail.com"
};
