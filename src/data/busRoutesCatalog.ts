import type {LatLng} from '../types/transit';

export interface CompanyRouteItem {
  id: string;
  company: string;
  code: string;
  description: string;
  corridor: string;
  center: LatLng;
  path: LatLng[];
  color: string;
  fareCop: number;
  etaMinutes: number;
  nextMinutes: number;
}

export interface BusCompanySummary {
  name: string;
  count: number;
  color: string;
}

export const BUS_COMPANIES: BusCompanySummary[] = [
  {
    "name": "Coolitoral",
    "count": 13,
    "color": "#0284C7"
  },
  {
    "name": "Coochofal",
    "count": 8,
    "color": "#DC2626"
  },
  {
    "name": "Sobusa",
    "count": 8,
    "color": "#16A34A"
  },
  {
    "name": "La Carolina",
    "count": 4,
    "color": "#0D9488"
  },
  {
    "name": "Sodetrans",
    "count": 7,
    "color": "#7C3AED"
  },
  {
    "name": "Transdiaz",
    "count": 2,
    "color": "#2563EB"
  },
  {
    "name": "Transurbar",
    "count": 3,
    "color": "#EA580C"
  },
  {
    "name": "Monterrey",
    "count": 4,
    "color": "#059669"
  },
  {
    "name": "Lucero San Felipe",
    "count": 8,
    "color": "#CA8A04"
  },
  {
    "name": "Cootransnorte",
    "count": 2,
    "color": "#0891B2"
  },
  {
    "name": "Flota Ángulo",
    "count": 2,
    "color": "#9333EA"
  },
  {
    "name": "Flota Roja",
    "count": 1,
    "color": "#B91C1C"
  },
  {
    "name": "Lolaya",
    "count": 3,
    "color": "#15803D"
  },
  {
    "name": "Trasalianco",
    "count": 4,
    "color": "#1D4ED8"
  },
  {
    "name": "Trasalfa",
    "count": 3,
    "color": "#4F46E5"
  },
  {
    "name": "Cootrab",
    "count": 2,
    "color": "#0F766E"
  },
  {
    "name": "Cootransco",
    "count": 2,
    "color": "#16A34A"
  },
  {
    "name": "Cootransporcar",
    "count": 1,
    "color": "#C2410C"
  },
  {
    "name": "Cootrasol",
    "count": 3,
    "color": "#0369A1"
  },
  {
    "name": "Cooasoatlán",
    "count": 3,
    "color": "#6D28D9"
  },
  {
    "name": "Transmecar",
    "count": 4,
    "color": "#D97706"
  },
  {
    "name": "Transoledad",
    "count": 1,
    "color": "#BE123C"
  },
  {
    "name": "Embusa",
    "count": 1,
    "color": "#4338CA"
  },
  {
    "name": "Cootracolsur",
    "count": 2,
    "color": "#334155"
  }
];

export const COMPANY_BUS_ROUTES: CompanyRouteItem[] = [
  {
    "id": "A1-4106-0",
    "company": "Coolitoral",
    "code": "A1-4106",
    "description": "Silencio, Nogales, universidades, Villa Carolina y Vía 40",
    "corridor": "Corredor Vía 40 · Las Flores",
    "center": {
      "lat": 11.0095,
      "lng": -74.7945
    },
    "path": [
      {
        "lat": 11.0285,
        "lng": -74.8085
      },
      {
        "lat": 11.0125,
        "lng": -74.796
      },
      {
        "lat": 10.999,
        "lng": -74.785
      },
      {
        "lat": 10.985,
        "lng": -74.7755
      }
    ],
    "color": "#0284C7",
    "fareCop": 3100,
    "etaMinutes": 3,
    "nextMinutes": 11
  },
  {
    "id": "A3-4108-1",
    "company": "Coolitoral",
    "code": "A3-4108",
    "description": "Carrera 43, Peñita, Nogales y centro",
    "corridor": "Corredor Prado · Centro",
    "center": {
      "lat": 10.9905,
      "lng": -74.8015
    },
    "path": [
      {
        "lat": 10.9965,
        "lng": -74.811
      },
      {
        "lat": 10.991,
        "lng": -74.8035
      },
      {
        "lat": 10.9855,
        "lng": -74.794
      },
      {
        "lat": 10.98,
        "lng": -74.7835
      }
    ],
    "color": "#0284C7",
    "fareCop": 3100,
    "etaMinutes": 6,
    "nextMinutes": 14
  },
  {
    "id": "A4-4109-2",
    "company": "Coolitoral",
    "code": "A4-4109",
    "description": "Carrera 53, Gran Centro y Nogales",
    "corridor": "Corredor Prado · Centro",
    "center": {
      "lat": 10.9905,
      "lng": -74.8015
    },
    "path": [
      {
        "lat": 10.9965,
        "lng": -74.811
      },
      {
        "lat": 10.991,
        "lng": -74.8035
      },
      {
        "lat": 10.9855,
        "lng": -74.794
      },
      {
        "lat": 10.98,
        "lng": -74.7835
      }
    ],
    "color": "#0284C7",
    "fareCop": 3100,
    "etaMinutes": 9,
    "nextMinutes": 17
  },
  {
    "id": "B1-4117-3",
    "company": "Coolitoral",
    "code": "B1-4117",
    "description": "Vía 40, Calle 72 y Calle Caldas",
    "corridor": "Corredor Vía 40 · Las Flores",
    "center": {
      "lat": 11.0095,
      "lng": -74.7945
    },
    "path": [
      {
        "lat": 11.0285,
        "lng": -74.8085
      },
      {
        "lat": 11.0125,
        "lng": -74.796
      },
      {
        "lat": 10.999,
        "lng": -74.785
      },
      {
        "lat": 10.985,
        "lng": -74.7755
      }
    ],
    "color": "#0284C7",
    "fareCop": 3100,
    "etaMinutes": 12,
    "nextMinutes": 20
  },
  {
    "id": "B2A-4177-4",
    "company": "Coolitoral",
    "code": "B2A-4177",
    "description": "Manuela Beltrán, Calle 72 y Vía 40",
    "corridor": "Corredor Vía 40 · Las Flores",
    "center": {
      "lat": 11.0095,
      "lng": -74.7945
    },
    "path": [
      {
        "lat": 11.0285,
        "lng": -74.8085
      },
      {
        "lat": 11.0125,
        "lng": -74.796
      },
      {
        "lat": 10.999,
        "lng": -74.785
      },
      {
        "lat": 10.985,
        "lng": -74.7755
      }
    ],
    "color": "#0284C7",
    "fareCop": 3100,
    "etaMinutes": 3,
    "nextMinutes": 11
  },
  {
    "id": "B3-4119-5",
    "company": "Coolitoral",
    "code": "B3-4119",
    "description": "Pueblo/Carrera 38, centro y Cordialidad",
    "corridor": "Corredor Prado · Centro",
    "center": {
      "lat": 10.9905,
      "lng": -74.8015
    },
    "path": [
      {
        "lat": 10.9965,
        "lng": -74.811
      },
      {
        "lat": 10.991,
        "lng": -74.8035
      },
      {
        "lat": 10.9855,
        "lng": -74.794
      },
      {
        "lat": 10.98,
        "lng": -74.7835
      }
    ],
    "color": "#0284C7",
    "fareCop": 3100,
    "etaMinutes": 6,
    "nextMinutes": 14
  },
  {
    "id": "B17-4163-6",
    "company": "Coolitoral",
    "code": "B17-4163",
    "description": "Circunvalar, Makro y Buenavista; conexión al aeropuerto indicada por Alcaldía",
    "corridor": "Zona Norte · Calle 84 / Riomar",
    "center": {
      "lat": 11.0075,
      "lng": -74.8135
    },
    "path": [
      {
        "lat": 10.9985,
        "lng": -74.8195
      },
      {
        "lat": 11.0055,
        "lng": -74.812
      },
      {
        "lat": 11.0135,
        "lng": -74.8205
      },
      {
        "lat": 11.019,
        "lng": -74.8325
      }
    ],
    "color": "#0284C7",
    "fareCop": 3100,
    "etaMinutes": 9,
    "nextMinutes": 17
  },
  {
    "id": "C19-4178-7",
    "company": "Coolitoral",
    "code": "C19-4178",
    "description": "Pueblo/Cordialidad, centro y Carrera 38",
    "corridor": "Corredor Prado · Centro",
    "center": {
      "lat": 10.9905,
      "lng": -74.8015
    },
    "path": [
      {
        "lat": 10.9965,
        "lng": -74.811
      },
      {
        "lat": 10.991,
        "lng": -74.8035
      },
      {
        "lat": 10.9855,
        "lng": -74.794
      },
      {
        "lat": 10.98,
        "lng": -74.7835
      }
    ],
    "color": "#0284C7",
    "fareCop": 3100,
    "etaMinutes": 12,
    "nextMinutes": 20
  },
  {
    "id": "PT1-4101-8",
    "company": "Coolitoral",
    "code": "PT1-4101",
    "description": "La Pradera, Pinar del Río, Villa San Pablo y Juan Mina",
    "corridor": "Suroccidente · Caribe Verde",
    "center": {
      "lat": 10.9665,
      "lng": -74.8425
    },
    "path": [
      {
        "lat": 10.982,
        "lng": -74.826
      },
      {
        "lat": 10.969,
        "lng": -74.839
      },
      {
        "lat": 10.955,
        "lng": -74.852
      }
    ],
    "color": "#0284C7",
    "fareCop": 3100,
    "etaMinutes": 3,
    "nextMinutes": 11
  },
  {
    "id": "PT2-4102-9",
    "company": "Coolitoral",
    "code": "PT2-4102",
    "description": "Soledad 2000, Calle 17, Zona Franca, Vía 40, Las Flores y universidades",
    "corridor": "Corredor Vía 40 · Las Flores",
    "center": {
      "lat": 11.0095,
      "lng": -74.7945
    },
    "path": [
      {
        "lat": 11.0285,
        "lng": -74.8085
      },
      {
        "lat": 11.0125,
        "lng": -74.796
      },
      {
        "lat": 10.999,
        "lng": -74.785
      },
      {
        "lat": 10.985,
        "lng": -74.7755
      }
    ],
    "color": "#0284C7",
    "fareCop": 3100,
    "etaMinutes": 6,
    "nextMinutes": 14
  },
  {
    "id": "PT3-4103-10",
    "company": "Coolitoral",
    "code": "PT3-4103",
    "description": "Soledad 2000, Las Moras, Circunvalar, universidades y Vía 40",
    "corridor": "Corredor Vía 40 · Las Flores",
    "center": {
      "lat": 11.0095,
      "lng": -74.7945
    },
    "path": [
      {
        "lat": 11.0285,
        "lng": -74.8085
      },
      {
        "lat": 11.0125,
        "lng": -74.796
      },
      {
        "lat": 10.999,
        "lng": -74.785
      },
      {
        "lat": 10.985,
        "lng": -74.7755
      }
    ],
    "color": "#0284C7",
    "fareCop": 3100,
    "etaMinutes": 9,
    "nextMinutes": 17
  },
  {
    "id": "PT4-4104-11",
    "company": "Coolitoral",
    "code": "PT4-4104",
    "description": "Circular entre Circunvalar, Las Flores y Vía 40",
    "corridor": "Corredor Vía 40 · Las Flores",
    "center": {
      "lat": 11.0095,
      "lng": -74.7945
    },
    "path": [
      {
        "lat": 11.0285,
        "lng": -74.8085
      },
      {
        "lat": 11.0125,
        "lng": -74.796
      },
      {
        "lat": 10.999,
        "lng": -74.785
      },
      {
        "lat": 10.985,
        "lng": -74.7755
      }
    ],
    "color": "#0284C7",
    "fareCop": 3100,
    "etaMinutes": 12,
    "nextMinutes": 20
  },
  {
    "id": "PT5-4105-12",
    "company": "Coolitoral",
    "code": "PT5-4105",
    "description": "Circular entre Vía 40, Las Flores y Circunvalar",
    "corridor": "Corredor Vía 40 · Las Flores",
    "center": {
      "lat": 11.0095,
      "lng": -74.7945
    },
    "path": [
      {
        "lat": 11.0285,
        "lng": -74.8085
      },
      {
        "lat": 11.0125,
        "lng": -74.796
      },
      {
        "lat": 10.999,
        "lng": -74.785
      },
      {
        "lat": 10.985,
        "lng": -74.7755
      }
    ],
    "color": "#0284C7",
    "fareCop": 3100,
    "etaMinutes": 3,
    "nextMinutes": 11
  },
  {
    "id": "A15-4159-13",
    "company": "Coochofal",
    "code": "A15-4159",
    "description": "Soledad 2000, Carrera 43, Calle 84 y Zoológico",
    "corridor": "Zona Norte · Calle 84 / Riomar",
    "center": {
      "lat": 11.0075,
      "lng": -74.8135
    },
    "path": [
      {
        "lat": 10.9985,
        "lng": -74.8195
      },
      {
        "lat": 11.0055,
        "lng": -74.812
      },
      {
        "lat": 11.0135,
        "lng": -74.8205
      },
      {
        "lat": 11.019,
        "lng": -74.8325
      }
    ],
    "color": "#DC2626",
    "fareCop": 3100,
    "etaMinutes": 6,
    "nextMinutes": 14
  },
  {
    "id": "C2-4133-14",
    "company": "Coochofal",
    "code": "C2-4133",
    "description": "Almendros, Campito, Calle 30 y Mercado",
    "corridor": "Corredor Calle 30 · Centro",
    "center": {
      "lat": 10.9745,
      "lng": -74.7855
    },
    "path": [
      {
        "lat": 10.961,
        "lng": -74.783
      },
      {
        "lat": 10.9715,
        "lng": -74.781
      },
      {
        "lat": 10.981,
        "lng": -74.78
      },
      {
        "lat": 10.986,
        "lng": -74.786
      }
    ],
    "color": "#DC2626",
    "fareCop": 3100,
    "etaMinutes": 9,
    "nextMinutes": 17
  },
  {
    "id": "C2-B-4187-15",
    "company": "Coochofal",
    "code": "C2-B-4187",
    "description": "Variante: Soledad, Cordialidad, Carrera 38 y centro",
    "corridor": "Corredor Prado · Centro",
    "center": {
      "lat": 10.9905,
      "lng": -74.8015
    },
    "path": [
      {
        "lat": 10.9965,
        "lng": -74.811
      },
      {
        "lat": 10.991,
        "lng": -74.8035
      },
      {
        "lat": 10.9855,
        "lng": -74.794
      },
      {
        "lat": 10.98,
        "lng": -74.7835
      }
    ],
    "color": "#DC2626",
    "fareCop": 3100,
    "etaMinutes": 12,
    "nextMinutes": 20
  },
  {
    "id": "C3-4134-16",
    "company": "Coochofal",
    "code": "C3-4134",
    "description": "Los Cedros, Los Robles, Calle 30 y Mercado",
    "corridor": "Corredor Calle 30 · Centro",
    "center": {
      "lat": 10.9745,
      "lng": -74.7855
    },
    "path": [
      {
        "lat": 10.961,
        "lng": -74.783
      },
      {
        "lat": 10.9715,
        "lng": -74.781
      },
      {
        "lat": 10.981,
        "lng": -74.78
      },
      {
        "lat": 10.986,
        "lng": -74.786
      }
    ],
    "color": "#DC2626",
    "fareCop": 3100,
    "etaMinutes": 3,
    "nextMinutes": 11
  },
  {
    "id": "C4-4135-17",
    "company": "Coochofal",
    "code": "C4-4135",
    "description": "Los Robles, 7 de Abril, Calle 72 y Vía 40",
    "corridor": "Corredor Vía 40 · Las Flores",
    "center": {
      "lat": 11.0095,
      "lng": -74.7945
    },
    "path": [
      {
        "lat": 11.0285,
        "lng": -74.8085
      },
      {
        "lat": 11.0125,
        "lng": -74.796
      },
      {
        "lat": 10.999,
        "lng": -74.785
      },
      {
        "lat": 10.985,
        "lng": -74.7755
      }
    ],
    "color": "#DC2626",
    "fareCop": 3100,
    "etaMinutes": 6,
    "nextMinutes": 14
  },
  {
    "id": "C9-4140-18",
    "company": "Coochofal",
    "code": "C9-4140",
    "description": "Circular: 7 de Abril, Carrera 14, Calle 30, Mercado y CUC",
    "corridor": "Corredor Prado · Centro",
    "center": {
      "lat": 10.9905,
      "lng": -74.8015
    },
    "path": [
      {
        "lat": 10.9965,
        "lng": -74.811
      },
      {
        "lat": 10.991,
        "lng": -74.8035
      },
      {
        "lat": 10.9855,
        "lng": -74.794
      },
      {
        "lat": 10.98,
        "lng": -74.7835
      }
    ],
    "color": "#DC2626",
    "fareCop": 3100,
    "etaMinutes": 9,
    "nextMinutes": 17
  },
  {
    "id": "C18-4141-19",
    "company": "Coochofal",
    "code": "C18-4141",
    "description": "Circular: 7 de Abril, Sofía Camargo, Catedral y CUC",
    "corridor": "Corredor Prado · Centro",
    "center": {
      "lat": 10.9905,
      "lng": -74.8015
    },
    "path": [
      {
        "lat": 10.9965,
        "lng": -74.811
      },
      {
        "lat": 10.991,
        "lng": -74.8035
      },
      {
        "lat": 10.9855,
        "lng": -74.794
      },
      {
        "lat": 10.98,
        "lng": -74.7835
      }
    ],
    "color": "#DC2626",
    "fareCop": 3100,
    "etaMinutes": 12,
    "nextMinutes": 20
  },
  {
    "id": "D20-4185-20",
    "company": "Coochofal",
    "code": "D20-4185",
    "description": "Circunvalar, Cordialidad y Soledad 2000",
    "corridor": "Corredor Cordialidad",
    "center": {
      "lat": 10.962,
      "lng": -74.815
    },
    "path": [
      {
        "lat": 10.945,
        "lng": -74.828
      },
      {
        "lat": 10.958,
        "lng": -74.8175
      },
      {
        "lat": 10.972,
        "lng": -74.8065
      },
      {
        "lat": 10.9805,
        "lng": -74.7945
      }
    ],
    "color": "#DC2626",
    "fareCop": 3100,
    "etaMinutes": 3,
    "nextMinutes": 11
  },
  {
    "id": "B18-4175-A-21",
    "company": "Sobusa",
    "code": "B18-4175 A",
    "description": "Tcherassi, centro, Vía 40, Las Flores, Villa Campestre y Urbaplaya",
    "corridor": "Corredor Vía 40 · Las Flores",
    "center": {
      "lat": 11.0095,
      "lng": -74.7945
    },
    "path": [
      {
        "lat": 11.0285,
        "lng": -74.8085
      },
      {
        "lat": 11.0125,
        "lng": -74.796
      },
      {
        "lat": 10.999,
        "lng": -74.785
      },
      {
        "lat": 10.985,
        "lng": -74.7755
      }
    ],
    "color": "#16A34A",
    "fareCop": 3100,
    "etaMinutes": 6,
    "nextMinutes": 14
  },
  {
    "id": "B18-4175-B-22",
    "company": "Sobusa",
    "code": "B18-4175 B",
    "description": "Variante: Granabastos, Soledad, Murillo, Carrera 43, centro/Prado",
    "corridor": "Corredor Prado · Centro",
    "center": {
      "lat": 10.9905,
      "lng": -74.8015
    },
    "path": [
      {
        "lat": 10.9965,
        "lng": -74.811
      },
      {
        "lat": 10.991,
        "lng": -74.8035
      },
      {
        "lat": 10.9855,
        "lng": -74.794
      },
      {
        "lat": 10.98,
        "lng": -74.7835
      }
    ],
    "color": "#16A34A",
    "fareCop": 3100,
    "etaMinutes": 9,
    "nextMinutes": 17
  },
  {
    "id": "C11-4168-23",
    "company": "Sobusa",
    "code": "C11-4168",
    "description": "Granabastos, Carrera 14/15, Silencio y Uninorte",
    "corridor": "Zona Norte · Calle 84 / Riomar",
    "center": {
      "lat": 11.0075,
      "lng": -74.8135
    },
    "path": [
      {
        "lat": 10.9985,
        "lng": -74.8195
      },
      {
        "lat": 11.0055,
        "lng": -74.812
      },
      {
        "lat": 11.0135,
        "lng": -74.8205
      },
      {
        "lat": 11.019,
        "lng": -74.8325
      }
    ],
    "color": "#16A34A",
    "fareCop": 3100,
    "etaMinutes": 12,
    "nextMinutes": 20
  },
  {
    "id": "C12-4169-A-24",
    "company": "Sobusa",
    "code": "C12-4169 A",
    "description": "Vivero y Paraíso",
    "corridor": "Área Metropolitana BAQ",
    "center": {
      "lat": 10.985,
      "lng": -74.802
    },
    "path": [
      {
        "lat": 10.9939,
        "lng": -74.8069
      },
      {
        "lat": 10.985,
        "lng": -74.802
      },
      {
        "lat": 10.9745,
        "lng": -74.7855
      }
    ],
    "color": "#16A34A",
    "fareCop": 3100,
    "etaMinutes": 3,
    "nextMinutes": 11
  },
  {
    "id": "C13-4143-25",
    "company": "Sobusa",
    "code": "C13-4143",
    "description": "Carrera 50 y Paraíso",
    "corridor": "Corredor Prado · Centro",
    "center": {
      "lat": 10.9905,
      "lng": -74.8015
    },
    "path": [
      {
        "lat": 10.9965,
        "lng": -74.811
      },
      {
        "lat": 10.991,
        "lng": -74.8035
      },
      {
        "lat": 10.9855,
        "lng": -74.794
      },
      {
        "lat": 10.98,
        "lng": -74.7835
      }
    ],
    "color": "#16A34A",
    "fareCop": 3100,
    "etaMinutes": 6,
    "nextMinutes": 14
  },
  {
    "id": "C14-4170-26",
    "company": "Sobusa",
    "code": "C14-4170",
    "description": "Carrera 54 y Uninorte",
    "corridor": "Zona Norte · Calle 84 / Riomar",
    "center": {
      "lat": 11.0075,
      "lng": -74.8135
    },
    "path": [
      {
        "lat": 10.9985,
        "lng": -74.8195
      },
      {
        "lat": 11.0055,
        "lng": -74.812
      },
      {
        "lat": 11.0135,
        "lng": -74.8205
      },
      {
        "lat": 11.019,
        "lng": -74.8325
      }
    ],
    "color": "#16A34A",
    "fareCop": 3100,
    "etaMinutes": 9,
    "nextMinutes": 17
  },
  {
    "id": "C16-4167-A-27",
    "company": "Sobusa",
    "code": "C16-4167 A",
    "description": "Granabastos, Calle 72 y Uninorte",
    "corridor": "Zona Norte · Calle 84 / Riomar",
    "center": {
      "lat": 11.0075,
      "lng": -74.8135
    },
    "path": [
      {
        "lat": 10.9985,
        "lng": -74.8195
      },
      {
        "lat": 11.0055,
        "lng": -74.812
      },
      {
        "lat": 11.0135,
        "lng": -74.8205
      },
      {
        "lat": 11.019,
        "lng": -74.8325
      }
    ],
    "color": "#16A34A",
    "fareCop": 3100,
    "etaMinutes": 12,
    "nextMinutes": 20
  },
  {
    "id": "C16-4167-B-28",
    "company": "Sobusa",
    "code": "C16-4167 B",
    "description": "Variante: Granabastos, Calle 72, Uninorte y Manuela Beltrán",
    "corridor": "Zona Norte · Calle 84 / Riomar",
    "center": {
      "lat": 11.0075,
      "lng": -74.8135
    },
    "path": [
      {
        "lat": 10.9985,
        "lng": -74.8195
      },
      {
        "lat": 11.0055,
        "lng": -74.812
      },
      {
        "lat": 11.0135,
        "lng": -74.8205
      },
      {
        "lat": 11.019,
        "lng": -74.8325
      }
    ],
    "color": "#16A34A",
    "fareCop": 3100,
    "etaMinutes": 3,
    "nextMinutes": 11
  },
  {
    "id": "A16-4161-A-29",
    "company": "La Carolina",
    "code": "A16-4161 A",
    "description": "Miramar",
    "corridor": "Zona Norte · Calle 84 / Riomar",
    "center": {
      "lat": 11.0075,
      "lng": -74.8135
    },
    "path": [
      {
        "lat": 10.9985,
        "lng": -74.8195
      },
      {
        "lat": 11.0055,
        "lng": -74.812
      },
      {
        "lat": 11.0135,
        "lng": -74.8205
      },
      {
        "lat": 11.019,
        "lng": -74.8325
      }
    ],
    "color": "#0D9488",
    "fareCop": 3100,
    "etaMinutes": 6,
    "nextMinutes": 14
  },
  {
    "id": "A16-4161-B-30",
    "company": "La Carolina",
    "code": "A16-4161 B",
    "description": "Carolina Express",
    "corridor": "Área Metropolitana BAQ",
    "center": {
      "lat": 10.985,
      "lng": -74.802
    },
    "path": [
      {
        "lat": 10.9939,
        "lng": -74.8069
      },
      {
        "lat": 10.985,
        "lng": -74.802
      },
      {
        "lat": 10.9745,
        "lng": -74.7855
      }
    ],
    "color": "#0D9488",
    "fareCop": 3100,
    "etaMinutes": 9,
    "nextMinutes": 17
  },
  {
    "id": "D6-4150-31",
    "company": "La Carolina",
    "code": "D6-4150",
    "description": "Calle 30, CUC, Base Naval y Villa Carolina",
    "corridor": "Corredor Prado · Centro",
    "center": {
      "lat": 10.9905,
      "lng": -74.8015
    },
    "path": [
      {
        "lat": 10.9965,
        "lng": -74.811
      },
      {
        "lat": 10.991,
        "lng": -74.8035
      },
      {
        "lat": 10.9855,
        "lng": -74.794
      },
      {
        "lat": 10.98,
        "lng": -74.7835
      }
    ],
    "color": "#0D9488",
    "fareCop": 3100,
    "etaMinutes": 12,
    "nextMinutes": 20
  },
  {
    "id": "D7-4151-32",
    "company": "La Carolina",
    "code": "D7-4151",
    "description": "Calle 17, Base Naval, CUC y Villa Carolina",
    "corridor": "Corredor Prado · Centro",
    "center": {
      "lat": 10.9905,
      "lng": -74.8015
    },
    "path": [
      {
        "lat": 10.9965,
        "lng": -74.811
      },
      {
        "lat": 10.991,
        "lng": -74.8035
      },
      {
        "lat": 10.9855,
        "lng": -74.794
      },
      {
        "lat": 10.98,
        "lng": -74.7835
      }
    ],
    "color": "#0D9488",
    "fareCop": 3100,
    "etaMinutes": 3,
    "nextMinutes": 11
  },
  {
    "id": "B14-4174-33",
    "company": "Sodetrans",
    "code": "B14-4174",
    "description": "Malvinas y Placa Roja",
    "corridor": "Área Metropolitana BAQ",
    "center": {
      "lat": 10.985,
      "lng": -74.802
    },
    "path": [
      {
        "lat": 10.9939,
        "lng": -74.8069
      },
      {
        "lat": 10.985,
        "lng": -74.802
      },
      {
        "lat": 10.9745,
        "lng": -74.7855
      }
    ],
    "color": "#7C3AED",
    "fareCop": 3100,
    "etaMinutes": 6,
    "nextMinutes": 14
  },
  {
    "id": "B15-4129-A-34",
    "company": "Sodetrans",
    "code": "B15-4129 A",
    "description": "La Paz y Calle 53",
    "corridor": "Área Metropolitana BAQ",
    "center": {
      "lat": 10.985,
      "lng": -74.802
    },
    "path": [
      {
        "lat": 10.9939,
        "lng": -74.8069
      },
      {
        "lat": 10.985,
        "lng": -74.802
      },
      {
        "lat": 10.9745,
        "lng": -74.7855
      }
    ],
    "color": "#7C3AED",
    "fareCop": 3100,
    "etaMinutes": 9,
    "nextMinutes": 17
  },
  {
    "id": "B15-4129-B-35",
    "company": "Sodetrans",
    "code": "B15-4129 B",
    "description": "Sourdis y Calle 50",
    "corridor": "Área Metropolitana BAQ",
    "center": {
      "lat": 10.985,
      "lng": -74.802
    },
    "path": [
      {
        "lat": 10.9939,
        "lng": -74.8069
      },
      {
        "lat": 10.985,
        "lng": -74.802
      },
      {
        "lat": 10.9745,
        "lng": -74.7855
      }
    ],
    "color": "#7C3AED",
    "fareCop": 3100,
    "etaMinutes": 12,
    "nextMinutes": 20
  },
  {
    "id": "B17-36",
    "company": "Sodetrans",
    "code": "B17",
    "description": "Makro, Circunvalar y Buenavista",
    "corridor": "Zona Norte · Calle 84 / Riomar",
    "center": {
      "lat": 11.0075,
      "lng": -74.8135
    },
    "path": [
      {
        "lat": 10.9985,
        "lng": -74.8195
      },
      {
        "lat": 11.0055,
        "lng": -74.812
      },
      {
        "lat": 11.0135,
        "lng": -74.8205
      },
      {
        "lat": 11.019,
        "lng": -74.8325
      }
    ],
    "color": "#7C3AED",
    "fareCop": 3100,
    "etaMinutes": 3,
    "nextMinutes": 11
  },
  {
    "id": "C21-4182-A-37",
    "company": "Sodetrans",
    "code": "C21-4182 A",
    "description": "Ciudad del Puerto, Cordialidad y Ciudadela Universitaria",
    "corridor": "Corredor Cordialidad",
    "center": {
      "lat": 10.962,
      "lng": -74.815
    },
    "path": [
      {
        "lat": 10.945,
        "lng": -74.828
      },
      {
        "lat": 10.958,
        "lng": -74.8175
      },
      {
        "lat": 10.972,
        "lng": -74.8065
      },
      {
        "lat": 10.9805,
        "lng": -74.7945
      }
    ],
    "color": "#7C3AED",
    "fareCop": 3100,
    "etaMinutes": 6,
    "nextMinutes": 14
  },
  {
    "id": "C21-4182-B-38",
    "company": "Sodetrans",
    "code": "C21-4182 B",
    "description": "Soledad, Calle 30, Carrera 54 y Riomar",
    "corridor": "Zona Norte · Calle 84 / Riomar",
    "center": {
      "lat": 11.0075,
      "lng": -74.8135
    },
    "path": [
      {
        "lat": 10.9985,
        "lng": -74.8195
      },
      {
        "lat": 11.0055,
        "lng": -74.812
      },
      {
        "lat": 11.0135,
        "lng": -74.8205
      },
      {
        "lat": 11.019,
        "lng": -74.8325
      }
    ],
    "color": "#7C3AED",
    "fareCop": 3100,
    "etaMinutes": 9,
    "nextMinutes": 17
  },
  {
    "id": "SODIS-Transfer-39",
    "company": "Sodetrans",
    "code": "SODIS Transfer",
    "description": "Servicio Transfer",
    "corridor": "Área Metropolitana BAQ",
    "center": {
      "lat": 10.985,
      "lng": -74.802
    },
    "path": [
      {
        "lat": 10.9939,
        "lng": -74.8069
      },
      {
        "lat": 10.985,
        "lng": -74.802
      },
      {
        "lat": 10.9745,
        "lng": -74.7855
      }
    ],
    "color": "#7C3AED",
    "fareCop": 3100,
    "etaMinutes": 12,
    "nextMinutes": 20
  },
  {
    "id": "A10-4114-A-40",
    "company": "Transdiaz",
    "code": "A10-4114 A",
    "description": "Manga y Calle 84",
    "corridor": "Zona Norte · Calle 84 / Riomar",
    "center": {
      "lat": 11.0075,
      "lng": -74.8135
    },
    "path": [
      {
        "lat": 10.9985,
        "lng": -74.8195
      },
      {
        "lat": 11.0055,
        "lng": -74.812
      },
      {
        "lat": 11.0135,
        "lng": -74.8205
      },
      {
        "lat": 11.019,
        "lng": -74.8325
      }
    ],
    "color": "#2563EB",
    "fareCop": 3100,
    "etaMinutes": 3,
    "nextMinutes": 11
  },
  {
    "id": "A10-4114-B-41",
    "company": "Transdiaz",
    "code": "A10-4114 B",
    "description": "Circunvalar, Carrera 46 y Calle 84",
    "corridor": "Zona Norte · Calle 84 / Riomar",
    "center": {
      "lat": 11.0075,
      "lng": -74.8135
    },
    "path": [
      {
        "lat": 10.9985,
        "lng": -74.8195
      },
      {
        "lat": 11.0055,
        "lng": -74.812
      },
      {
        "lat": 11.0135,
        "lng": -74.8205
      },
      {
        "lat": 11.019,
        "lng": -74.8325
      }
    ],
    "color": "#2563EB",
    "fareCop": 3100,
    "etaMinutes": 6,
    "nextMinutes": 14
  },
  {
    "id": "A14-4116-42",
    "company": "Transurbar",
    "code": "A14-4116",
    "description": "María Modelo, Circunvalar/Cordialidad/Manuela Beltrán (correspondencia por confirmar)",
    "corridor": "Corredor Cordialidad",
    "center": {
      "lat": 10.962,
      "lng": -74.815
    },
    "path": [
      {
        "lat": 10.945,
        "lng": -74.828
      },
      {
        "lat": 10.958,
        "lng": -74.8175
      },
      {
        "lat": 10.972,
        "lng": -74.8065
      },
      {
        "lat": 10.9805,
        "lng": -74.7945
      }
    ],
    "color": "#EA580C",
    "fareCop": 3100,
    "etaMinutes": 9,
    "nextMinutes": 17
  },
  {
    "id": "D16-4173-43",
    "company": "Transurbar",
    "code": "D16-4173",
    "description": "Soledad, Calle 30, Vía 40 y centro",
    "corridor": "Corredor Vía 40 · Las Flores",
    "center": {
      "lat": 11.0095,
      "lng": -74.7945
    },
    "path": [
      {
        "lat": 11.0285,
        "lng": -74.8085
      },
      {
        "lat": 11.0125,
        "lng": -74.796
      },
      {
        "lat": 10.999,
        "lng": -74.785
      },
      {
        "lat": 10.985,
        "lng": -74.7755
      }
    ],
    "color": "#EA580C",
    "fareCop": 3100,
    "etaMinutes": 12,
    "nextMinutes": 20
  },
  {
    "id": "D19-4184-44",
    "company": "Transurbar",
    "code": "D19-4184",
    "description": "Soledad, Circunvalar, Murillo y centro",
    "corridor": "Corredor Murillo (Calle 45)",
    "center": {
      "lat": 10.9742,
      "lng": -74.7995
    },
    "path": [
      {
        "lat": 10.9685,
        "lng": -74.8105
      },
      {
        "lat": 10.9742,
        "lng": -74.7995
      },
      {
        "lat": 10.9801,
        "lng": -74.7888
      },
      {
        "lat": 10.9848,
        "lng": -74.7805
      }
    ],
    "color": "#EA580C",
    "fareCop": 3100,
    "etaMinutes": 3,
    "nextMinutes": 11
  },
  {
    "id": "B11-4166-45",
    "company": "Monterrey",
    "code": "B11-4166",
    "description": "7 de Agosto, El Bosque, Silencio y Villa Country",
    "corridor": "Área Metropolitana BAQ",
    "center": {
      "lat": 10.985,
      "lng": -74.802
    },
    "path": [
      {
        "lat": 10.9939,
        "lng": -74.8069
      },
      {
        "lat": 10.985,
        "lng": -74.802
      },
      {
        "lat": 10.9745,
        "lng": -74.7855
      }
    ],
    "color": "#059669",
    "fareCop": 3100,
    "etaMinutes": 6,
    "nextMinutes": 14
  },
  {
    "id": "B11-B-4192-46",
    "company": "Monterrey",
    "code": "B11-B-4192",
    "description": "Variante Monterrey: 7 de Agosto, El Bosque, Silencio y Villa Country",
    "corridor": "Área Metropolitana BAQ",
    "center": {
      "lat": 10.985,
      "lng": -74.802
    },
    "path": [
      {
        "lat": 10.9939,
        "lng": -74.8069
      },
      {
        "lat": 10.985,
        "lng": -74.802
      },
      {
        "lat": 10.9745,
        "lng": -74.7855
      }
    ],
    "color": "#059669",
    "fareCop": 3100,
    "etaMinutes": 9,
    "nextMinutes": 17
  },
  {
    "id": "B12-4127-47",
    "company": "Monterrey",
    "code": "B12-4127",
    "description": "El Bosque, Calle 30/Mercado, Vía 40 y Las Flores",
    "corridor": "Corredor Vía 40 · Las Flores",
    "center": {
      "lat": 11.0095,
      "lng": -74.7945
    },
    "path": [
      {
        "lat": 11.0285,
        "lng": -74.8085
      },
      {
        "lat": 11.0125,
        "lng": -74.796
      },
      {
        "lat": 10.999,
        "lng": -74.785
      },
      {
        "lat": 10.985,
        "lng": -74.7755
      }
    ],
    "color": "#059669",
    "fareCop": 3100,
    "etaMinutes": 12,
    "nextMinutes": 20
  },
  {
    "id": "B8-4124-48",
    "company": "Monterrey",
    "code": "B8-4124",
    "description": "Santo Domingo, La Manga, Campo Alegre y CUC",
    "corridor": "Corredor Prado · Centro",
    "center": {
      "lat": 10.9905,
      "lng": -74.8015
    },
    "path": [
      {
        "lat": 10.9965,
        "lng": -74.811
      },
      {
        "lat": 10.991,
        "lng": -74.8035
      },
      {
        "lat": 10.9855,
        "lng": -74.794
      },
      {
        "lat": 10.98,
        "lng": -74.7835
      }
    ],
    "color": "#059669",
    "fareCop": 3100,
    "etaMinutes": 3,
    "nextMinutes": 11
  },
  {
    "id": "A18-4183-49",
    "company": "Lucero San Felipe",
    "code": "A18-4183",
    "description": "Caribe Verde, Circunvalar, Calle 72 y centro",
    "corridor": "Corredor Calle 72",
    "center": {
      "lat": 10.9939,
      "lng": -74.8069
    },
    "path": [
      {
        "lat": 10.9901,
        "lng": -74.8155
      },
      {
        "lat": 10.9939,
        "lng": -74.8069
      },
      {
        "lat": 10.9974,
        "lng": -74.7988
      },
      {
        "lat": 11.0005,
        "lng": -74.7918
      }
    ],
    "color": "#CA8A04",
    "fareCop": 3100,
    "etaMinutes": 6,
    "nextMinutes": 14
  },
  {
    "id": "B4-4120-50",
    "company": "Lucero San Felipe",
    "code": "B4-4120",
    "description": "Galapa y Calle 72",
    "corridor": "Corredor Calle 72",
    "center": {
      "lat": 10.9939,
      "lng": -74.8069
    },
    "path": [
      {
        "lat": 10.9901,
        "lng": -74.8155
      },
      {
        "lat": 10.9939,
        "lng": -74.8069
      },
      {
        "lat": 10.9974,
        "lng": -74.7988
      },
      {
        "lat": 11.0005,
        "lng": -74.7918
      }
    ],
    "color": "#CA8A04",
    "fareCop": 3100,
    "etaMinutes": 9,
    "nextMinutes": 17
  },
  {
    "id": "B5-4121-51",
    "company": "Lucero San Felipe",
    "code": "B5-4121",
    "description": "Olivos y Mequejo",
    "corridor": "Área Metropolitana BAQ",
    "center": {
      "lat": 10.985,
      "lng": -74.802
    },
    "path": [
      {
        "lat": 10.9939,
        "lng": -74.8069
      },
      {
        "lat": 10.985,
        "lng": -74.802
      },
      {
        "lat": 10.9745,
        "lng": -74.7855
      }
    ],
    "color": "#CA8A04",
    "fareCop": 3100,
    "etaMinutes": 12,
    "nextMinutes": 20
  },
  {
    "id": "B5-B-4190-52",
    "company": "Lucero San Felipe",
    "code": "B5-B-4190",
    "description": "Variante: Soledad, Calle 30 y Carrera 43",
    "corridor": "Corredor Prado · Centro",
    "center": {
      "lat": 10.9905,
      "lng": -74.8015
    },
    "path": [
      {
        "lat": 10.9965,
        "lng": -74.811
      },
      {
        "lat": 10.991,
        "lng": -74.8035
      },
      {
        "lat": 10.9855,
        "lng": -74.794
      },
      {
        "lat": 10.98,
        "lng": -74.7835
      }
    ],
    "color": "#CA8A04",
    "fareCop": 3100,
    "etaMinutes": 3,
    "nextMinutes": 11
  },
  {
    "id": "B6-4122-53",
    "company": "Lucero San Felipe",
    "code": "B6-4122",
    "description": "Caribe Verde, Nueva Colombia, Carrera 45 y centro",
    "corridor": "Suroccidente · Caribe Verde",
    "center": {
      "lat": 10.9665,
      "lng": -74.8425
    },
    "path": [
      {
        "lat": 10.982,
        "lng": -74.826
      },
      {
        "lat": 10.969,
        "lng": -74.839
      },
      {
        "lat": 10.955,
        "lng": -74.852
      }
    ],
    "color": "#CA8A04",
    "fareCop": 3100,
    "etaMinutes": 6,
    "nextMinutes": 14
  },
  {
    "id": "B7-4123-54",
    "company": "Lucero San Felipe",
    "code": "B7-4123",
    "description": "Soledad, Calle 30, Prado y Bellavista",
    "corridor": "Corredor Prado · Centro",
    "center": {
      "lat": 10.9905,
      "lng": -74.8015
    },
    "path": [
      {
        "lat": 10.9965,
        "lng": -74.811
      },
      {
        "lat": 10.991,
        "lng": -74.8035
      },
      {
        "lat": 10.9855,
        "lng": -74.794
      },
      {
        "lat": 10.98,
        "lng": -74.7835
      }
    ],
    "color": "#CA8A04",
    "fareCop": 3100,
    "etaMinutes": 9,
    "nextMinutes": 17
  },
  {
    "id": "B20-4180-55",
    "company": "Lucero San Felipe",
    "code": "B20-4180",
    "description": "Caribe Verde, Cordialidad, Murillo y centro",
    "corridor": "Corredor Murillo (Calle 45)",
    "center": {
      "lat": 10.9742,
      "lng": -74.7995
    },
    "path": [
      {
        "lat": 10.9685,
        "lng": -74.8105
      },
      {
        "lat": 10.9742,
        "lng": -74.7995
      },
      {
        "lat": 10.9801,
        "lng": -74.7888
      },
      {
        "lat": 10.9848,
        "lng": -74.7805
      }
    ],
    "color": "#CA8A04",
    "fareCop": 3100,
    "etaMinutes": 12,
    "nextMinutes": 20
  },
  {
    "id": "B20-B-4191-56",
    "company": "Lucero San Felipe",
    "code": "B20-B-4191",
    "description": "Variante: Caribe Verde, Cordialidad y centro",
    "corridor": "Corredor Cordialidad",
    "center": {
      "lat": 10.962,
      "lng": -74.815
    },
    "path": [
      {
        "lat": 10.945,
        "lng": -74.828
      },
      {
        "lat": 10.958,
        "lng": -74.8175
      },
      {
        "lat": 10.972,
        "lng": -74.8065
      },
      {
        "lat": 10.9805,
        "lng": -74.7945
      }
    ],
    "color": "#CA8A04",
    "fareCop": 3100,
    "etaMinutes": 3,
    "nextMinutes": 11
  },
  {
    "id": "A5-4110-57",
    "company": "Cootransnorte",
    "code": "A5-4110",
    "description": "Cordialidad",
    "corridor": "Corredor Cordialidad",
    "center": {
      "lat": 10.962,
      "lng": -74.815
    },
    "path": [
      {
        "lat": 10.945,
        "lng": -74.828
      },
      {
        "lat": 10.958,
        "lng": -74.8175
      },
      {
        "lat": 10.972,
        "lng": -74.8065
      },
      {
        "lat": 10.9805,
        "lng": -74.7945
      }
    ],
    "color": "#0891B2",
    "fareCop": 3100,
    "etaMinutes": 6,
    "nextMinutes": 14
  },
  {
    "id": "A6-4111-58",
    "company": "Cootransnorte",
    "code": "A6-4111",
    "description": "Vía 40",
    "corridor": "Corredor Vía 40 · Las Flores",
    "center": {
      "lat": 11.0095,
      "lng": -74.7945
    },
    "path": [
      {
        "lat": 11.0285,
        "lng": -74.8085
      },
      {
        "lat": 11.0125,
        "lng": -74.796
      },
      {
        "lat": 10.999,
        "lng": -74.785
      },
      {
        "lat": 10.985,
        "lng": -74.7755
      }
    ],
    "color": "#0891B2",
    "fareCop": 3100,
    "etaMinutes": 9,
    "nextMinutes": 17
  },
  {
    "id": "A7-4112-59",
    "company": "Flota Ángulo",
    "code": "A7-4112",
    "description": "Expreso Porvenir/Carrera 43, Capri, Nogales, Colinas y La Pradera",
    "corridor": "Corredor Prado · Centro",
    "center": {
      "lat": 10.9905,
      "lng": -74.8015
    },
    "path": [
      {
        "lat": 10.9965,
        "lng": -74.811
      },
      {
        "lat": 10.991,
        "lng": -74.8035
      },
      {
        "lat": 10.9855,
        "lng": -74.794
      },
      {
        "lat": 10.98,
        "lng": -74.7835
      }
    ],
    "color": "#9333EA",
    "fareCop": 3100,
    "etaMinutes": 12,
    "nextMinutes": 20
  },
  {
    "id": "A7-4112-B-60",
    "company": "Flota Ángulo",
    "code": "A7-4112 B",
    "description": "Variante Alameda",
    "corridor": "Área Metropolitana BAQ",
    "center": {
      "lat": 10.985,
      "lng": -74.802
    },
    "path": [
      {
        "lat": 10.9939,
        "lng": -74.8069
      },
      {
        "lat": 10.985,
        "lng": -74.802
      },
      {
        "lat": 10.9745,
        "lng": -74.7855
      }
    ],
    "color": "#9333EA",
    "fareCop": 3100,
    "etaMinutes": 3,
    "nextMinutes": 11
  },
  {
    "id": "A8-4113-61",
    "company": "Flota Roja",
    "code": "A8-4113",
    "description": "Simón Bolívar, Calle 30, Carrera 43, Calle 84 y Zoológico",
    "corridor": "Zona Norte · Calle 84 / Riomar",
    "center": {
      "lat": 11.0075,
      "lng": -74.8135
    },
    "path": [
      {
        "lat": 10.9985,
        "lng": -74.8195
      },
      {
        "lat": 11.0055,
        "lng": -74.812
      },
      {
        "lat": 11.0135,
        "lng": -74.8205
      },
      {
        "lat": 11.019,
        "lng": -74.8325
      }
    ],
    "color": "#B91C1C",
    "fareCop": 3100,
    "etaMinutes": 6,
    "nextMinutes": 14
  },
  {
    "id": "B10-4126-62",
    "company": "Lolaya",
    "code": "B10-4126",
    "description": "Soledad 2000, Calle 30 y centro",
    "corridor": "Corredor Calle 30 · Centro",
    "center": {
      "lat": 10.9745,
      "lng": -74.7855
    },
    "path": [
      {
        "lat": 10.961,
        "lng": -74.783
      },
      {
        "lat": 10.9715,
        "lng": -74.781
      },
      {
        "lat": 10.981,
        "lng": -74.78
      },
      {
        "lat": 10.986,
        "lng": -74.786
      }
    ],
    "color": "#15803D",
    "fareCop": 3100,
    "etaMinutes": 9,
    "nextMinutes": 17
  },
  {
    "id": "B10-B-4193-63",
    "company": "Lolaya",
    "code": "B10-B-4193",
    "description": "Variante: Soledad 2000, Calle 30 y centro",
    "corridor": "Corredor Calle 30 · Centro",
    "center": {
      "lat": 10.9745,
      "lng": -74.7855
    },
    "path": [
      {
        "lat": 10.961,
        "lng": -74.783
      },
      {
        "lat": 10.9715,
        "lng": -74.781
      },
      {
        "lat": 10.981,
        "lng": -74.78
      },
      {
        "lat": 10.986,
        "lng": -74.786
      }
    ],
    "color": "#15803D",
    "fareCop": 3100,
    "etaMinutes": 12,
    "nextMinutes": 20
  },
  {
    "id": "D8-4165-64",
    "company": "Lolaya",
    "code": "D8-4165",
    "description": "Soledad, Murillo, Calle 30 y Granabastos",
    "corridor": "Corredor Murillo (Calle 45)",
    "center": {
      "lat": 10.9742,
      "lng": -74.7995
    },
    "path": [
      {
        "lat": 10.9685,
        "lng": -74.8105
      },
      {
        "lat": 10.9742,
        "lng": -74.7995
      },
      {
        "lat": 10.9801,
        "lng": -74.7888
      },
      {
        "lat": 10.9848,
        "lng": -74.7805
      }
    ],
    "color": "#15803D",
    "fareCop": 3100,
    "etaMinutes": 3,
    "nextMinutes": 11
  },
  {
    "id": "B19-4176-65",
    "company": "Trasalianco",
    "code": "B19-4176",
    "description": "Simón Bolívar",
    "corridor": "Área Metropolitana BAQ",
    "center": {
      "lat": 10.985,
      "lng": -74.802
    },
    "path": [
      {
        "lat": 10.9939,
        "lng": -74.8069
      },
      {
        "lat": 10.985,
        "lng": -74.802
      },
      {
        "lat": 10.9745,
        "lng": -74.7855
      }
    ],
    "color": "#1D4ED8",
    "fareCop": 3100,
    "etaMinutes": 6,
    "nextMinutes": 14
  },
  {
    "id": "D12-4154-66",
    "company": "Trasalianco",
    "code": "D12-4154",
    "description": "Malambo, Calle 30, Prado, Carrera 53 y Calle 76",
    "corridor": "Corredor Prado · Centro",
    "center": {
      "lat": 10.9905,
      "lng": -74.8015
    },
    "path": [
      {
        "lat": 10.9965,
        "lng": -74.811
      },
      {
        "lat": 10.991,
        "lng": -74.8035
      },
      {
        "lat": 10.9855,
        "lng": -74.794
      },
      {
        "lat": 10.98,
        "lng": -74.7835
      }
    ],
    "color": "#1D4ED8",
    "fareCop": 3100,
    "etaMinutes": 9,
    "nextMinutes": 17
  },
  {
    "id": "D17-4158-67",
    "company": "Trasalianco",
    "code": "D17-4158",
    "description": "Concorde, Calle 30, centro, Catedral y CUC",
    "corridor": "Corredor Prado · Centro",
    "center": {
      "lat": 10.9905,
      "lng": -74.8015
    },
    "path": [
      {
        "lat": 10.9965,
        "lng": -74.811
      },
      {
        "lat": 10.991,
        "lng": -74.8035
      },
      {
        "lat": 10.9855,
        "lng": -74.794
      },
      {
        "lat": 10.98,
        "lng": -74.7835
      }
    ],
    "color": "#1D4ED8",
    "fareCop": 3100,
    "etaMinutes": 12,
    "nextMinutes": 20
  },
  {
    "id": "D18-4179-68",
    "company": "Trasalianco",
    "code": "D18-4179",
    "description": "Malambo, Simón Bolívar, Las Nieves, centro y Prado",
    "corridor": "Corredor Prado · Centro",
    "center": {
      "lat": 10.9905,
      "lng": -74.8015
    },
    "path": [
      {
        "lat": 10.9965,
        "lng": -74.811
      },
      {
        "lat": 10.991,
        "lng": -74.8035
      },
      {
        "lat": 10.9855,
        "lng": -74.794
      },
      {
        "lat": 10.98,
        "lng": -74.7835
      }
    ],
    "color": "#1D4ED8",
    "fareCop": 3100,
    "etaMinutes": 3,
    "nextMinutes": 11
  },
  {
    "id": "B2-B-4118-69",
    "company": "Trasalfa",
    "code": "B2-B-4118",
    "description": "Variante: Vía 40, Calle 30 y Pimsa",
    "corridor": "Corredor Vía 40 · Las Flores",
    "center": {
      "lat": 11.0095,
      "lng": -74.7945
    },
    "path": [
      {
        "lat": 11.0285,
        "lng": -74.8085
      },
      {
        "lat": 11.0125,
        "lng": -74.796
      },
      {
        "lat": 10.999,
        "lng": -74.785
      },
      {
        "lat": 10.985,
        "lng": -74.7755
      }
    ],
    "color": "#4F46E5",
    "fareCop": 3100,
    "etaMinutes": 6,
    "nextMinutes": 14
  },
  {
    "id": "D14-4156-70",
    "company": "Trasalfa",
    "code": "D14-4156",
    "description": "Malambo, Pimsa y Vía 40",
    "corridor": "Corredor Vía 40 · Las Flores",
    "center": {
      "lat": 11.0095,
      "lng": -74.7945
    },
    "path": [
      {
        "lat": 11.0285,
        "lng": -74.8085
      },
      {
        "lat": 11.0125,
        "lng": -74.796
      },
      {
        "lat": 10.999,
        "lng": -74.785
      },
      {
        "lat": 10.985,
        "lng": -74.7755
      }
    ],
    "color": "#4F46E5",
    "fareCop": 3100,
    "etaMinutes": 9,
    "nextMinutes": 17
  },
  {
    "id": "D15-4157-71",
    "company": "Trasalfa",
    "code": "D15-4157",
    "description": "Calle 30, Soledad y centro",
    "corridor": "Corredor Calle 30 · Centro",
    "center": {
      "lat": 10.9745,
      "lng": -74.7855
    },
    "path": [
      {
        "lat": 10.961,
        "lng": -74.783
      },
      {
        "lat": 10.9715,
        "lng": -74.781
      },
      {
        "lat": 10.981,
        "lng": -74.78
      },
      {
        "lat": 10.986,
        "lng": -74.786
      }
    ],
    "color": "#4F46E5",
    "fareCop": 3100,
    "etaMinutes": 12,
    "nextMinutes": 20
  },
  {
    "id": "C5-4135-72",
    "company": "Cootrab",
    "code": "C5-4135",
    "description": "Arboleda, Palmas, Cocos, CUC y Boston",
    "corridor": "Corredor Prado · Centro",
    "center": {
      "lat": 10.9905,
      "lng": -74.8015
    },
    "path": [
      {
        "lat": 10.9965,
        "lng": -74.811
      },
      {
        "lat": 10.991,
        "lng": -74.8035
      },
      {
        "lat": 10.9855,
        "lng": -74.794
      },
      {
        "lat": 10.98,
        "lng": -74.7835
      }
    ],
    "color": "#0F766E",
    "fareCop": 3100,
    "etaMinutes": 3,
    "nextMinutes": 11
  },
  {
    "id": "C6-4137-73",
    "company": "Cootrab",
    "code": "C6-4137",
    "description": "Gaviotas, Nieves, CUC, Vía 40, Calle 70 y Carrera 58",
    "corridor": "Corredor Vía 40 · Las Flores",
    "center": {
      "lat": 11.0095,
      "lng": -74.7945
    },
    "path": [
      {
        "lat": 11.0285,
        "lng": -74.8085
      },
      {
        "lat": 11.0125,
        "lng": -74.796
      },
      {
        "lat": 10.999,
        "lng": -74.785
      },
      {
        "lat": 10.985,
        "lng": -74.7755
      }
    ],
    "color": "#0F766E",
    "fareCop": 3100,
    "etaMinutes": 6,
    "nextMinutes": 14
  },
  {
    "id": "C7-4138-A-74",
    "company": "Cootransco",
    "code": "C7-4138 A",
    "description": "Ruta Verde/Nevada: El Ferry, Carrera 7B, Las Ferias y centro",
    "corridor": "Corredor Calle 30 · Centro",
    "center": {
      "lat": 10.9745,
      "lng": -74.7855
    },
    "path": [
      {
        "lat": 10.961,
        "lng": -74.783
      },
      {
        "lat": 10.9715,
        "lng": -74.781
      },
      {
        "lat": 10.981,
        "lng": -74.78
      },
      {
        "lat": 10.986,
        "lng": -74.786
      }
    ],
    "color": "#16A34A",
    "fareCop": 3100,
    "etaMinutes": 9,
    "nextMinutes": 17
  },
  {
    "id": "C7-4138-B-75",
    "company": "Cootransco",
    "code": "C7-4138 B",
    "description": "Ruta Amarilla/Nevada: El Ferry, Carrera 7B, Las Ferias y centro",
    "corridor": "Corredor Calle 30 · Centro",
    "center": {
      "lat": 10.9745,
      "lng": -74.7855
    },
    "path": [
      {
        "lat": 10.961,
        "lng": -74.783
      },
      {
        "lat": 10.9715,
        "lng": -74.781
      },
      {
        "lat": 10.981,
        "lng": -74.78
      },
      {
        "lat": 10.986,
        "lng": -74.786
      }
    ],
    "color": "#16A34A",
    "fareCop": 3100,
    "etaMinutes": 12,
    "nextMinutes": 20
  },
  {
    "id": "C8-4139-76",
    "company": "Cootransporcar",
    "code": "C8-4139",
    "description": "Rebolo, Andes, Calle 72, Zoológico y Villa Tarel",
    "corridor": "Corredor Calle 72",
    "center": {
      "lat": 10.9939,
      "lng": -74.8069
    },
    "path": [
      {
        "lat": 10.9901,
        "lng": -74.8155
      },
      {
        "lat": 10.9939,
        "lng": -74.8069
      },
      {
        "lat": 10.9974,
        "lng": -74.7988
      },
      {
        "lat": 11.0005,
        "lng": -74.7918
      }
    ],
    "color": "#C2410C",
    "fareCop": 3100,
    "etaMinutes": 3,
    "nextMinutes": 11
  },
  {
    "id": "D3-4147-77",
    "company": "Cootrasol",
    "code": "D3-4147",
    "description": "Arboleda, Normandía, Calle 30 y centro",
    "corridor": "Corredor Calle 30 · Centro",
    "center": {
      "lat": 10.9745,
      "lng": -74.7855
    },
    "path": [
      {
        "lat": 10.961,
        "lng": -74.783
      },
      {
        "lat": 10.9715,
        "lng": -74.781
      },
      {
        "lat": 10.981,
        "lng": -74.78
      },
      {
        "lat": 10.986,
        "lng": -74.786
      }
    ],
    "color": "#0369A1",
    "fareCop": 3100,
    "etaMinutes": 6,
    "nextMinutes": 14
  },
  {
    "id": "D4-4148-78",
    "company": "Cootrasol",
    "code": "D4-4148",
    "description": "Arboleda, Villa Angelita, Calle 30 y Mercado",
    "corridor": "Corredor Calle 30 · Centro",
    "center": {
      "lat": 10.9745,
      "lng": -74.7855
    },
    "path": [
      {
        "lat": 10.961,
        "lng": -74.783
      },
      {
        "lat": 10.9715,
        "lng": -74.781
      },
      {
        "lat": 10.981,
        "lng": -74.78
      },
      {
        "lat": 10.986,
        "lng": -74.786
      }
    ],
    "color": "#0369A1",
    "fareCop": 3100,
    "etaMinutes": 9,
    "nextMinutes": 17
  },
  {
    "id": "D5-4149-79",
    "company": "Cootrasol",
    "code": "D5-4149",
    "description": "Hipódromo, Calle 30, Mercado y centro",
    "corridor": "Corredor Calle 30 · Centro",
    "center": {
      "lat": 10.9745,
      "lng": -74.7855
    },
    "path": [
      {
        "lat": 10.961,
        "lng": -74.783
      },
      {
        "lat": 10.9715,
        "lng": -74.781
      },
      {
        "lat": 10.981,
        "lng": -74.78
      },
      {
        "lat": 10.986,
        "lng": -74.786
      }
    ],
    "color": "#0369A1",
    "fareCop": 3100,
    "etaMinutes": 12,
    "nextMinutes": 20
  },
  {
    "id": "C1-4132-80",
    "company": "Cooasoatlán",
    "code": "C1-4132",
    "description": "Calle 84/Calle 72/Tcherassi (el directorio no confirma correspondencia del código)",
    "corridor": "Zona Norte · Calle 84 / Riomar",
    "center": {
      "lat": 11.0075,
      "lng": -74.8135
    },
    "path": [
      {
        "lat": 10.9985,
        "lng": -74.8195
      },
      {
        "lat": 11.0055,
        "lng": -74.812
      },
      {
        "lat": 11.0135,
        "lng": -74.8205
      },
      {
        "lat": 11.019,
        "lng": -74.8325
      }
    ],
    "color": "#6D28D9",
    "fareCop": 3100,
    "etaMinutes": 3,
    "nextMinutes": 11
  },
  {
    "id": "C1-B-4186-81",
    "company": "Cooasoatlán",
    "code": "C1-B-4186",
    "description": "Variante: Soledad 2000, Calle 30, Carrera 38 y centro",
    "corridor": "Corredor Prado · Centro",
    "center": {
      "lat": 10.9905,
      "lng": -74.8015
    },
    "path": [
      {
        "lat": 10.9965,
        "lng": -74.811
      },
      {
        "lat": 10.991,
        "lng": -74.8035
      },
      {
        "lat": 10.9855,
        "lng": -74.794
      },
      {
        "lat": 10.98,
        "lng": -74.7835
      }
    ],
    "color": "#6D28D9",
    "fareCop": 3100,
    "etaMinutes": 6,
    "nextMinutes": 14
  },
  {
    "id": "C20-B-4187-82",
    "company": "Cooasoatlán",
    "code": "C20-B-4187",
    "description": "Soledad 2000, Circunvalar y Uninorte",
    "corridor": "Zona Norte · Calle 84 / Riomar",
    "center": {
      "lat": 11.0075,
      "lng": -74.8135
    },
    "path": [
      {
        "lat": 10.9985,
        "lng": -74.8195
      },
      {
        "lat": 11.0055,
        "lng": -74.812
      },
      {
        "lat": 11.0135,
        "lng": -74.8205
      },
      {
        "lat": 11.019,
        "lng": -74.8325
      }
    ],
    "color": "#6D28D9",
    "fareCop": 3100,
    "etaMinutes": 9,
    "nextMinutes": 17
  },
  {
    "id": "C17-4160-83",
    "company": "Transmecar",
    "code": "C17-4160",
    "description": "Malambo, Calle 30, Mercado, Carrera 54/58 y Éxito 77",
    "corridor": "Corredor Prado · Centro",
    "center": {
      "lat": 10.9905,
      "lng": -74.8015
    },
    "path": [
      {
        "lat": 10.9965,
        "lng": -74.811
      },
      {
        "lat": 10.991,
        "lng": -74.8035
      },
      {
        "lat": 10.9855,
        "lng": -74.794
      },
      {
        "lat": 10.98,
        "lng": -74.7835
      }
    ],
    "color": "#D97706",
    "fareCop": 3100,
    "etaMinutes": 12,
    "nextMinutes": 20
  },
  {
    "id": "D9-4152-84",
    "company": "Transmecar",
    "code": "D9-4152",
    "description": "Calle 17, Soledad 2000, La Central y Granabastos",
    "corridor": "Corredor Sur · Soledad / Malambo",
    "center": {
      "lat": 10.938,
      "lng": -74.777
    },
    "path": [
      {
        "lat": 10.968,
        "lng": -74.784
      },
      {
        "lat": 10.946,
        "lng": -74.7785
      },
      {
        "lat": 10.924,
        "lng": -74.7745
      },
      {
        "lat": 10.892,
        "lng": -74.779
      }
    ],
    "color": "#D97706",
    "fareCop": 3100,
    "etaMinutes": 3,
    "nextMinutes": 11
  },
  {
    "id": "D10-4172-85",
    "company": "Transmecar",
    "code": "D10-4172",
    "description": "Calle 17, Malambo y Caracolí",
    "corridor": "Corredor Sur · Soledad / Malambo",
    "center": {
      "lat": 10.938,
      "lng": -74.777
    },
    "path": [
      {
        "lat": 10.968,
        "lng": -74.784
      },
      {
        "lat": 10.946,
        "lng": -74.7785
      },
      {
        "lat": 10.924,
        "lng": -74.7745
      },
      {
        "lat": 10.892,
        "lng": -74.779
      }
    ],
    "color": "#D97706",
    "fareCop": 3100,
    "etaMinutes": 6,
    "nextMinutes": 14
  },
  {
    "id": "D11-4153-86",
    "company": "Transmecar",
    "code": "D11-4153",
    "description": "Malambo, Calle 17, CUC y Universidad Simón Bolívar",
    "corridor": "Corredor Prado · Centro",
    "center": {
      "lat": 10.9905,
      "lng": -74.8015
    },
    "path": [
      {
        "lat": 10.9965,
        "lng": -74.811
      },
      {
        "lat": 10.991,
        "lng": -74.8035
      },
      {
        "lat": 10.9855,
        "lng": -74.794
      },
      {
        "lat": 10.98,
        "lng": -74.7835
      }
    ],
    "color": "#D97706",
    "fareCop": 3100,
    "etaMinutes": 9,
    "nextMinutes": 17
  },
  {
    "id": "D13-4155-87",
    "company": "Transoledad",
    "code": "D13-4155",
    "description": "Soledad, Calle 30, American Bar y centro",
    "corridor": "Corredor Calle 30 · Centro",
    "center": {
      "lat": 10.9745,
      "lng": -74.7855
    },
    "path": [
      {
        "lat": 10.961,
        "lng": -74.783
      },
      {
        "lat": 10.9715,
        "lng": -74.781
      },
      {
        "lat": 10.981,
        "lng": -74.78
      },
      {
        "lat": 10.986,
        "lng": -74.786
      }
    ],
    "color": "#BE123C",
    "fareCop": 3100,
    "etaMinutes": 12,
    "nextMinutes": 20
  },
  {
    "id": "B9-4125-88",
    "company": "Embusa",
    "code": "B9-4125",
    "description": "Calle 17, Palmas, Andes y Éxito 77",
    "corridor": "Corredor Sur · Soledad / Malambo",
    "center": {
      "lat": 10.938,
      "lng": -74.777
    },
    "path": [
      {
        "lat": 10.968,
        "lng": -74.784
      },
      {
        "lat": 10.946,
        "lng": -74.7785
      },
      {
        "lat": 10.924,
        "lng": -74.7745
      },
      {
        "lat": 10.892,
        "lng": -74.779
      }
    ],
    "color": "#4338CA",
    "fareCop": 3100,
    "etaMinutes": 3,
    "nextMinutes": 11
  },
  {
    "id": "D1-89",
    "company": "Cootracolsur",
    "code": "D1",
    "description": "Recorrido no detallado en el directorio consultado",
    "corridor": "Área Metropolitana BAQ",
    "center": {
      "lat": 10.985,
      "lng": -74.802
    },
    "path": [
      {
        "lat": 10.9939,
        "lng": -74.8069
      },
      {
        "lat": 10.985,
        "lng": -74.802
      },
      {
        "lat": 10.9745,
        "lng": -74.7855
      }
    ],
    "color": "#334155",
    "fareCop": 3100,
    "etaMinutes": 6,
    "nextMinutes": 14
  },
  {
    "id": "D2-90",
    "company": "Cootracolsur",
    "code": "D2",
    "description": "Recorrido no detallado en el directorio consultado",
    "corridor": "Área Metropolitana BAQ",
    "center": {
      "lat": 10.985,
      "lng": -74.802
    },
    "path": [
      {
        "lat": 10.9939,
        "lng": -74.8069
      },
      {
        "lat": 10.985,
        "lng": -74.802
      },
      {
        "lat": 10.9745,
        "lng": -74.7855
      }
    ],
    "color": "#334155",
    "fareCop": 3100,
    "etaMinutes": 9,
    "nextMinutes": 17
  }
];
