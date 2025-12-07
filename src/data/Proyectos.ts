export interface BloqueContenido {
  tipo: "imagen" | "galeria" | "carrete" | "video" | "videoyoutube";
  data: string[]; // para video solo usarás data[0]
}


export interface Proyecto {
  id: number;
  portada: string;
  titulo: string;
  categoria: string;
  descripcion: string;
  bloques: BloqueContenido[];
  herramientas: string[];
}

export const proyectos: Proyecto[] = [
  {
    id: 1,
    portada: "/assetsport/portadadiva.jpg",
    titulo: "Dra. Diva Marin",
    categoria: "Manejo de Redes Sociales",
    descripcion:
      "Manejo de redes sociales y creación de contenido para la Dra. Diva Marin, especialista en Odontología estética de la ciudad de Medellín.",
    herramientas: ["Ai", "Ps"],
    bloques: [
    {
      tipo: "imagen",
      data: ["/assetsport/diva1.png"]
    },
    {
      tipo: "carrete",
      data: [
        "/assetsport/divacarrete1.jpg",
        "/assetsport/divacarrete2.jpg",
        "/assetsport/divacarrete3.jpg",
        "/assetsport/divacarrete4.jpg"
      ]
    },
    {
      tipo: "imagen",
      data: ["/assetsport/portadadiva.jpg"]
    },
    {
        tipo: "carrete",
        data: [
          "/assetsport/diva2carrete1.jpg",
          "/assetsport/diva2carrete2.jpg",
          "/assetsport/diva2carrete3.png",
          "/assetsport/diva2carrete4.png"
        ]
    },
    {
        tipo: "imagen",
        data: ["/assetsport/diva3.png"]
    },
    {
  tipo: "video",
  data: [
    "/assetsport/videos/divamarin1.mp4",
    "/assetsport/videos/divamarin2.mp4"
  ]
}

  ]
  },
  {
    id: 2,
    portada: "/assetsport/portadatakhalo.jpg",
    titulo: "Takhalo",
    categoria: "Manejo de Redes Sociales",
    descripcion:
      " Manejo de redes sociales y creación de contenido para Takhalo, restaurante de comida mexicana en Medellín, Colombia.",
   
    herramientas: ["Ai", "Ps", "3D"],
    bloques : [
      {
        tipo: "imagen",
        data: ["/assetsport/takhalo1.jpg"]
      },
      {
        tipo: "imagen",
        data: ["/assetsport/portadatakhalo.jpg"]
      },
      {
        tipo: "imagen",
        data: ["/assetsport/takhalo2.jpg"]
      },
      {
        tipo: "carrete",
        data: [
          "/assetsport/takhalocarrete1.1.jpg",
          "/assetsport/takhalocarrete1.2.jpg",
          "/assetsport/takhalocarrete1.3.jpg"
         
        ]
      },
      {
        tipo: "carrete",
        data: [
            "/assetsport/takhalocarrete2.1.jpg",
            "/assetsport/takhalocarrete2.2.jpg",
            "/assetsport/takhalocarrete2.3.jpg"
        ]
      },
      {
        tipo: "imagen",
        data: ["/assetsport/takhalo3.png"]
      },
        {
        tipo: "carrete",
        data: [
          "/assetsport/takhalocarrete3.1.jpg",
          "/assetsport/takhalocarrete3.2.jpg",
          "/assetsport/takhalocarrete3.3.jpg"
        ]
      }
    ]
  },
  {
    id: 3,
    portada: "/assetsport/portadaxtreme.jpg",
    titulo: "Xtreme Fun Zone",
    categoria: "Manejo de Redes Sociales",
    descripcion:
      "Manejo de redes sociales y creación de contenido para Xtreme Fun Zone, parque de trampolines ubicado en Medellín, Colombia.",
    
    herramientas: ["Ai", "Id", "Lr"],
    bloques : [
      
      {
        tipo: "carrete",
        data: [
          "/assetsport/xtremecar1.1.jpg",
          "/assetsport/xtremecar1.2.jpg"
         
        ]
      },
      {
        tipo: "carrete",
        data: [
            "/assetsport/xtremecar2.1.png",
            "/assetsport/xtremecar2.2.png",
            "/assetsport/xtremecar2.3.png",
            "/assetsport/xtremecar2.4.png"
        ]
      },
      {
        tipo: "imagen",
        data: ["/assetsport/portadaxtreme.jpg"]
      },
      {
        tipo: "imagen",
        data: ["/assetsport/xtreme2.jpg"]
      },
      {
        tipo: "carrete",
        data: [
          "/assetsport/xtremecar3.1.jpg",
          "/assetsport/xtremecar3.2.jpg",
          "/assetsport/xtremecar3.3.jpg"
        ]
      },
      {
        tipo: "video",
        data: [
          "/assetsport/videos/xtreme1.mp4",
          "/assetsport/videos/xtreme2.mp4",
          "/assetsport/videos/xtreme3.mp4"
        ]
      }
    ]
  },
  {
    id: 4,
    portada: "/assetsport/portadaevarey.jpg",
    titulo: "Desnúdate con Eva Rey",
    categoria: "Producción Audiovisual",
    descripcion:
      "Producción de contenido audiovisual y fotográfico para el programa Desnúdate con Eva Rey, con invitados en politica, farandula y entretenimiento.",
    herramientas: ["Ai", "Ps"],
      bloques : [
      {
        tipo: "imagen",
        data: ["/assetsport/eva1.jpg"]
      },
      {
        tipo: "carrete",
        data: [
          "/assetsport/evacarrete1.1.jpg",
          "/assetsport/evacarrete1.2.jpg"
         
        ]
      },
      {
        tipo: "carrete",
        data: [
            "/assetsport/evacarrete2.1.jpg",
            "/assetsport/portadaevarey.jpg"
        ]
      },
      {
        tipo: "videoyoutube",
        data: [
          "https://www.youtube.com/embed/OxIizHlEN8Y?si=7FdNlJAdTXgzGbJV",
          
        ]
      },
      {
        tipo: "videoyoutube",
        data: [
          "https://www.youtube.com/embed/LgVTJB6ztK0?si=jk5duqRzjEo4NSkW",
          "https://www.youtube.com/embed/GWZLk5wxPRI?si=rc0liKfCaEf6PeJf"
          
        ]
      }
    ]
  },
  {
    id: 5,
    portada: "/assetsport/portadapabloparrilla.jpg",
    titulo: "Pablo Parrila",
    categoria: "Manejo de Redes Sociales",
    descripcion:
      "Manejo de redes sociales y creación de contenido para el chef Pablo Parrila, especializado en parrilla y cocina al carbón.",
   
    herramientas: ["Ai", "Ps", "3D"],
    bloques : [
      {
        tipo: "imagen",
        data: ["/assetsport/portadapabloparrilla.jpg"]
      },
      {
        tipo: "imagen",
        data: ["/assetsport/pablo1.jpg"]
      },
      {
        tipo: "imagen",
        data: ["/assetsport/pablo2.jpg"]
      },
      {
        tipo: "imagen",
        data: ["/assetsport/pablo3.jpg"]
      },
      {
        tipo: "carrete",
        data: [
          "/assetsport/pablocar1.jpg",
          "/assetsport/pablocar1.2.jpg",
         
        ]
      },
      {
        tipo: "video",
        data: [
            "/assetsport/videos/pabloparrilla1.mp4",
            
        ]
      }
    ]
  },
  {
    id: 6,
    portada: "/assetsport/portadamartinfierro.jpg",
    titulo: "Martin Fierro",
    categoria: "Producción Audiovisual",
    descripcion: "Producción de contenido audiovisual y fotográfico para la marca Martin Fierro, incluyendo sesiones de fotos y videos promocionales.",
    herramientas: ["Ai", "Id", "Lr"],
    bloques : [
      {
        tipo: "imagen",
        data: ["/assetsport/portadamartinfierro.jpg"]
      },
      {
        tipo: "imagen",
        data: [
          "/assetsport/martin1.jpg"
        ]
      },
      {
        tipo: "imagen",
        data: [
            "/assetsport/martin2.jpg"
        ]
      },
      {
        tipo: "carrete",
        data: [
          "/assetsport/carretemartin1.1.png",
          "/assetsport/carretemartin1.2.png"
        ]
      }
      
    ]
  },
  {
    id: 7,
    portada: "/assetsport/portadarancho.jpg",
    titulo: "Fonda Rancho Guadalupe",
    categoria: "Producción Audiovisual",
    descripcion:
      "Producción de contenido audiovisual y fotográfico para la Fonda Rancho Guadalupe en Medellín.",
   
    herramientas: ["Ai", "Ps"],
    bloques : [
      {
        tipo: "imagen",
        data: ["/assetsport/rancho1.jpg"]
      },
      {
        tipo: "carrete",
        data: [
          "/assetsport/rancho2.jpg",
          "/assetsport/rancho3.jpg"
         
        ]
      },
      {
        tipo: "imagen",
        data: [
            "/assetsport/rancho4.jpg"
        ]
      },
      {
        tipo: "video",
        data: [
          "/assetsport/videos/rancho1.mp4",
          "/assetsport/videos/rancho2.mp4"
        ]
      }
    ]
  },
  {
    id: 8,
    portada: "/assetsport/portadasolobus.png",
    titulo: "Solobus",
    categoria: "Manejo de Redes Sociales",
    descripcion:
      "Manejo de redes sociales y creación de contenido para Solobus, empresa de transporte del Sur del Valle de Aburrá en la ciudad de Medellín.",
    
    herramientas: ["Ai", "Ps", "3D"],
    bloques : [
      {
        tipo: "imagen",
        data: ["/assetsport/portadasolobus.png"]
      },
      {
        tipo: "imagen",
        data: ["/assetsport/solobus1.png"]
      },
      {
        tipo: "carrete",
        data: [
          "/assetsport/solobus2.jpg",
          "/assetsport/solobus3.jpg",
          "/assetsport/solobus4.jpg"
        ]
      },
      {
        tipo: "carrete",
        data: [
            "/assetsport/solobus5.jpg",
            "/assetsport/solobus6.jpg"
        ]
      },
      {
        tipo: "video",
        data: [
          "/assetsport/videos/solobus1.mp4",
          "/assetsport/videos/solobus2.mp4",
          "/assetsport/videos/solobus3.mp4"
        ]
      }
    ]
  },
    {
    id: 9,
    portada: "/assetsport/portadacomplex.png",
    titulo: "Complex Ditaires",
    categoria: "Producción Audiovisual",
    descripcion:
      "Producción de contenido audiovisual y fotográfico para la marca Complex Ditaires, incluyendo sesiones de fotos y videos promocionales.",
    herramientas: ["Ai", "Id", "Lr"],  
    bloques : [
      {
        tipo: "imagen",
        data: ["/assetsport/portadacomplex.png"]
      },
      {
        tipo: "carrete",
        data: [
          "/assetsport/complex1.png",
          "/assetsport/complex2.png"
         
        ]
      },
      {
        tipo: "video",
        data: [
            "/assetsport/videos/complex1.mp4",
            "/assetsport/videos/complex2.mp4"
        ]
      },
      {
        tipo: "carrete",
        data: [
          "/assetsport/complex3.jpg",
          "/assetsport/complex4.jpg",
          "/assetsport/complex5.jpg"
        ]
      },
      {
        tipo: "carrete",
        data: [
          "/assetsport/complex6.jpg",
          "/assetsport/complex7.jpg",
          "/assetsport/complex8.jpg",
          "/assetsport/complex9.jpg"
        ]
      }
    ]
  },
  {
    id: 10,
    portada: "/assetsport/portadadesmarcas.jpg",
    titulo: "Desarrollo de marcas",
    categoria: "Manejo de Redes Sociales",
    descripcion:
      "Desarrollo de identidad visual para diversas marcas, incluyendo logotipos, paletas de colores y aplicaciones gráficas.",
    
    herramientas: ["Ai", "Ps", "3D"],
    bloques : [
      {
        tipo: "imagen",
        data: ["/assetsport/portadadesmarcas.jpg"]
      },
      {
        tipo: "imagen",
        data: ["/assetsport/marcas1.jpg"]
      },
      {
        tipo: "imagen",
        data: ["/assetsport/marcas2.jpg"]
      },
      {
        tipo: "imagen",
        data: ["/assetsport/marcas3.jpg"]
      },
      {
        tipo: "imagen",
        data: ["/assetsport/marcas4.jpg"]
      },
      {
        tipo: "imagen",
        data: ["/assetsport/marcas5.jpg"]
      },
      {
        tipo: "imagen",
        data: ["/assetsport/marcas6.jpg"]
      },
      {
        tipo: "imagen",
        data: ["/assetsport/marcas7.jpg"]
      }
    ]
  },
  {
    id: 11,
    portada: "/assetsport/icefruits1.jpg",
    titulo: "Ice Fruits",
    categoria: "Producción Audiovisual",
    descripcion:
      "Producción de contenido audiovisual y fotográfico para la marca de helados Ice Fruits.",
    bloques : [
      {
        tipo: "imagen",
        data: ["/assetsport/icefruits1.jpg"]
      },
      {
        tipo: "carrete",
        data: [
          "/assetsport/icefruits2.jpg",
          "/assetsport/icefruits3.jpg",
          "/assetsport/icefruits4.jpg",
          "/assetsport/icefruits5.jpg",
        ]
      },
      {
        tipo: "imagen",
        data: ["/assetsport/icefruits6.jpg"]
      },
      {
        tipo: "video",
        data: [
            "/assetsport/videos/icefruits1.mp4",
            "/assetsport/videos/icefruits2.mp4"
        ]
      }
    ],
    herramientas: ["Ai", "Id", "Lr"],
    },
    {
    id: 12,
    portada: "/assetsport/portadaagaval.jpg",
    titulo: "Agaval",
    categoria: "Transmisiones en vivo",
    descripcion:
      "Transmisión en vivo de eventos corporativos y sociales, con edición y postproducción de material audiovisual y fotográfico.",
    bloques : [
      {
        tipo: "carrete",
        data: [
          "/assetsport/agaval1.JPG",
          "/assetsport/agaval2.JPG",
          "/assetsport/agaval3.JPG"

        ]
      },
      {
        tipo: "videoyoutube",
        data: [
      "https://www.youtube.com/embed/K48lLwxGATY?si=y2c1aTU64mnQbUyr",
        ]
      }
    ],
    herramientas: ["Ai", "Ps", "3D"],
    }
];