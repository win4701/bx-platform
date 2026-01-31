const MINING_STATE = {
  activePlan: null,
  isMining: false,
  estimatedReturn: 0.0,
  availablePlans:     
  BX: [
    { id:"p10", name:"Starter",  days:10, roi:2.5, min:10,  max:100  },
    { id:"p21", name:"Basic",    days:21, roi:5,   min:50,  max:300  },
    { id:"p30", name:"Golden",   days:30, roi:8,   min:200, max:800  },
    { id:"p45", name:"Advanced", days:45, roi:12,  min:400, max:2500 },
    { id:"p60", name:"Platine",  days:60, roi:17,  min:750, max:9000 },
    { id:"p90", name:"Infinity", days:90, roi:25,  min:1000,max:20000, vip:true }
  ],

  SOL: [
    { id:"p10", name:"Starter",  days:10, roi:1,   min:1,   max:5   },
    { id:"p21", name:"Basic",    days:21, roi:2.8, min:10,  max:50  },
    { id:"p30", name:"Golden",   days:30, roi:4,   min:40,  max:160  },
    { id:"p45", name:"Advanced", days:45, roi:7,   min:120, max:500 },
    { id:"p60", name:"Platine",  days:60, roi:9,   min:200, max:1000 },
    { id:"p90", name:"Infinity", days:90, roi:14,  min:500, max:2500, vip:true }
  ],

  BNB: [
    { id:"p10", name:"Starter",  days:10, roi:0.8, min:0.05, max:1   },
    { id:"p21", name:"Basic",    days:21, roi:1.8, min:1,  max:4  },
    { id:"p30", name:"Golden",   days:30, roi:3,   min:5,  max:50   },
    { id:"p45", name:"Advanced", days:45, roi:5,   min:10,  max:100  },
    { id:"p60", name:"Platine",  days:60, roi:7,   min:15,    max:150  },
    { id:"p90", name:"Infinity", days:90, roi:11,  min:25,    max:200, vip:true }
  ]
};
  setPlan(plan) {
    this.activePlan = plan;
  },

  startMining() {
    this.isMining = true;
  },

  stopMining() {
    this.isMining = false;
  },

  setEstimatedReturn(returnAmount) {
    this.estimatedReturn = returnAmount;
  }
};
