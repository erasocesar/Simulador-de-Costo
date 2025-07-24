"use client"

import { useState, useEffect } from "react"
import {
  Search,
  Check,
  Clock,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight
} from "lucide-react"

// Definición de tipos
type Servicio = {
  id: number
  Nro: string
  Nombre_del_Servicio: string
  Area_IsaGIS_Technologies: string
  Grupo: string
  Subgrupo: string
  descripcion?: string
  Basicos: number
  Intermedios: number
  Avanzados: number
  Tiempos_de_entrega: string
  Tiempo_dias_habiles: number
  Detalles_Costo_Base: string
  Notas_Adicionales: string
  Descripción_Técnica_del_Servicio: string
  costoBase?: number
  seleccionado: boolean
}

type CostoBase = {
  id: number
  Tipo_de_Servicio: string
  Modalidad_de_Contrato: string
  Costos_Base: number
}

export default function ServiciosCombinadosCalculadora() {
  // --- Estados para combos (Departamento, Grupo)
  const [departamentosFiltro, setDepartamentosFiltro] = useState<string[]>([])
  const [gruposFiltro, setGruposFiltro] = useState<string[]>([])
  const [departamentoSeleccionado, setDepartamentoSeleccionado] = useState("Todos")
  const [grupoSeleccionado, setGrupoSeleccionado] = useState("Todos")

  // --- Estados para Catálogo
  const [serviciosCargados, setServiciosCargados] = useState<Servicio[]>([])
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([])
  const [busqueda, setBusqueda] = useState("")
  const [filtroCombinado, setFiltroCombinado] = useState("") // Valor seleccionado del dropdown de Servicios Combinados
  const [codigosCombinadosSeleccionados, setCodigosCombinadosSeleccionados] = useState<number[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // --- Estados para cálculos
  const [tiempoTotal, setTiempoTotal] = useState<number>(0)
  const [costosBase, setCostosBase] = useState<CostoBase[]>([])
  const [costosTotalesFull1, setCostosTotalesFull1] = useState<number>(0)
  const [costosTotalesFull2, setCostosTotalesFull2] = useState<number>(0)
  const [costosTotalesPromo1, setCostosTotalesPromo1] = useState<number>(0)
  const [costosTotalesPromo2, setCostosTotalesPromo2] = useState<number>(0)
  const [costosTotalesPromo3, setCostosTotalesPromo3] = useState<number>(0)
  const [indiceDetalleActual, setIndiceDetalleActual] = useState(0)

  // --- Estado para almacenar el map/diccionario de Servicios Combinados
  // clave: Nombre_Servicio_Combinado, valor: array de codigos
  const [mapCombinados, setMapCombinados] = useState<{ [key: string]: number[] }>(
    {}
  )

  //
  // 1. Cargar Catálogo de Servicios (ArcGIS Online)
  //
  const cargarDatos = async () => {
    try {
      setCargando(true)
      setError(null)
      // URL actualizada a GeoJSON en GitHub
      const url = "https://raw.githubusercontent.com/erasocesar/GeoJSONs/refs/heads/main/Catalogo_de_Servicios.geojson"
      const response = await fetch(url, { method: "GET", headers: { Accept: "application/json" }, cache: "no-cache" })
      if (!response.ok) {
        throw new Error(`Error en la respuesta: ${response.status} ${response.statusText}`)
      }
      const data = await response.json()
      if (!data.features || !Array.isArray(data.features)) {
        throw new Error("No se encontraron features en la respuesta")
      }
  
      // Convertimos features -> array de Servicios
      const serviciosFormateados = data.features.map((feature: any, index: number) => {
        // Usamos properties en lugar de attributes
        const attrs = feature.properties || {}
        return {
          id: index + 1,
          Nro: attrs.Nro || `SRV${String(index + 1).padStart(3, "0")}`,
          Nombre_del_Servicio: attrs.Nombre_del_Servicio || "Servicio sin nombre",
          Area_IsaGIS_Technologies: attrs.Area_IsaGIS_Technologies || "Sin área",
          Grupo: attrs.Grupo || "Sin grupo",
          Subgrupo: attrs.Subgrupo || "Sin subgrupo",
          descripcion: attrs.descripcion || "",
          Basicos: typeof attrs.Basicos === "number" ? attrs.Basicos : 0,
          Intermedios: typeof attrs.Intermedios === "number" ? attrs.Intermedios : 0,
          Avanzados: typeof attrs.Avanzados === "number" ? attrs.Avanzados : 0,
          Tiempos_de_entrega: attrs.Tiempos_de_entrega || "N/A",
          Tiempo_dias_habiles: parseFloat(String(attrs.Tiempo__Dias_habiles_ || "0").replace(",", ".")),
          Detalles_Costo_Base: attrs.Detalles_Costo_Base || "Sin detalles",
          Notas_Adicionales: attrs.Notas_Adicionales || "Sin notas adicionales",
          Descripción_Técnica_del_Servicio: attrs["Descripción_Técnica_del_Servicio"] || "",
          costoBase: typeof attrs.costoBase === "number" ? attrs.costoBase : 0,
          seleccionado: selectedServiceIds.includes(index + 1),
        }
      })
  
      // Filtrar "Uso Interno IsaGIS" si no se desea mostrar
      const filtrados = serviciosFormateados.filter(
        (s) => s.Area_IsaGIS_Technologies !== "Uso Interno IsaGIS"
      )
      setServiciosCargados(filtrados)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error desconocido al cargar Catálogo")
      setServiciosCargados([])
    } finally {
      setCargando(false)
    }
  }  

  //
  // 2. Cargar Costos Base (ArcGIS Online)
  //
  useEffect(() => {
    const cargarCostosBase = async () => {
      try {
        // URL actualizada a GeoJSON en GitHub
        const url = "https://raw.githubusercontent.com/erasocesar/GeoJSONs/refs/heads/main/Tabla_Costos_Base.geojson"
        const response = await fetch(url, { method: "GET", headers: { Accept: "application/json" }, cache: "no-cache" })
        if (!response.ok) {
          throw new Error(`Error en la respuesta Costos Base: ${response.status} ${response.statusText}`)
        }
        const data = await response.json()
        if (!data.features || !Array.isArray(data.features)) {
          throw new Error("No se encontraron features en la respuesta de Costos Base")
        }
        const costosFormateados = data.features.map((feature: any, index: number) => {
          // Usamos properties en lugar de attributes
          const attrs = feature.properties || {}
          return {
            id: index + 1,
            Tipo_de_Servicio: attrs.Tipo_de_Servicio || "",
            Modalidad_de_Contrato: attrs.Modalidad_de_Contrato || "",
            Costos_Base: typeof attrs.Costos_Base === "number" ? attrs.Costos_Base : 0,
          }
        })
        setCostosBase(costosFormateados)
      } catch (error) {
        console.error("Error al cargar Costos Base:", error)
        setError(error instanceof Error ? error.message : "Error desconocido al cargar Costos Base")
        // En caso de error, valores por defecto (puedes mantener estos si los necesitas)
        const costosBaseDefecto = [
          { id: 1,  Tipo_de_Servicio: "Basico",     Modalidad_de_Contrato: "Full 1", Costos_Base: 400000 },
          { id: 2,  Tipo_de_Servicio: "Intermedio", Modalidad_de_Contrato: "Full 1", Costos_Base: 2500000 },
          { id: 3,  Tipo_de_Servicio: "Avanzado",   Modalidad_de_Contrato: "Full 1", Costos_Base: 5000000 },
          { id: 4,  Tipo_de_Servicio: "Basico",     Modalidad_de_Contrato: "Full 2", Costos_Base: 300000 },
          { id: 5,  Tipo_de_Servicio: "Intermedio", Modalidad_de_Contrato: "Full 2", Costos_Base: 2300000 },
          { id: 6,  Tipo_de_Servicio: "Avanzado",   Modalidad_de_Contrato: "Full 2", Costos_Base: 4000000 },
          { id: 7,  Tipo_de_Servicio: "Basico",     Modalidad_de_Contrato: "Promo 1", Costos_Base: 200000 },
          { id: 8,  Tipo_de_Servicio: "Intermedio", Modalidad_de_Contrato: "Promo 1", Costos_Base: 1500000 },
          { id: 9,  Tipo_de_Servicio: "Avanzado",   Modalidad_de_Contrato: "Promo 1", Costos_Base: 3000000 },
          { id: 10, Tipo_de_Servicio: "Basico",     Modalidad_de_Contrato: "Promo 2", Costos_Base: 100000 },
          { id: 11, Tipo_de_Servicio: "Intermedio", Modalidad_de_Contrato: "Promo 2", Costos_Base: 800000 },
          { id: 12, Tipo_de_Servicio: "Avanzado",   Modalidad_de_Contrato: "Promo 2", Costos_Base: 2000000 },
          { id: 13, Tipo_de_Servicio: "Basico",     Modalidad_de_Contrato: "Promo 3", Costos_Base: 50000 },
          { id: 14, Tipo_de_Servicio: "Intermedio", Modalidad_de_Contrato: "Promo 3", Costos_Base: 800000 },
          { id: 15, Tipo_de_Servicio: "Avanzado",   Modalidad_de_Contrato: "Promo 3", Costos_Base: 1400000 },
        ]
        setCostosBase(costosBaseDefecto)
      }
    }
    cargarCostosBase()
  }, [])  

  //
// 3. Cargar Catálogo de Servicios al iniciar
useEffect(() => {
  cargarDatos()
}, []) // <-- SIN [selectedServiceIds]

  //
  // 4. Cargar combos (Departamento, Grupo) desde un GeoJSON
  //
  useEffect(() => {
  fetch("https://raw.githubusercontent.com/erasocesar/GeoJSONs/refs/heads/main/Grupos_Areas.geojson")
    .then((res) => res.json())
    .then((data) => {
      const departamentos = Array.from(
        new Set(data.features.map((f: any) => f.properties.Area_IsaGIS_Technologies))
      ).filter(Boolean)
      setDepartamentosFiltro(departamentos)

      const grupos = data.features.map((f: any) => f.properties.Grupo).filter(Boolean)
      setGruposFiltro(grupos)
    })
    .catch((err) => console.error("Error al cargar combos (GeoJSON):", err))
}, [])


  // Actualizar combos de Grupo al cambiar Departamento
  useEffect(() => {
  fetch("https://raw.githubusercontent.com/erasocesar/GeoJSONs/refs/heads/main/Grupos_Areas.geojson")
    .then((res) => res.json())
    .then((data) => {
      let grupos: string[]

      if (departamentoSeleccionado === "Todos") {
        grupos = data.features.map((f: any) => f.properties.Grupo).filter(Boolean)
      } else {
        const filtrados = data.features.filter(
          (f: any) => f.properties.Area_IsaGIS_Technologies === departamentoSeleccionado
        )
        grupos = filtrados.map((f: any) => f.properties.Grupo).filter(Boolean)
      }

      setGruposFiltro(grupos)

      if (!grupos.includes(grupoSeleccionado)) {
        setGrupoSeleccionado("Todos")
      }
    })
    .catch((err) => console.error("Error actualizando combos de Grupo:", err))
}, [departamentoSeleccionado, grupoSeleccionado])

  //
  // 5. Filtros del Catálogo
  //
  useEffect(() => {
    let serviciosFiltrados = [...serviciosCargados];
  
    // 1. Si hay un Servicio Combinado activo, mostramos SOLO esos códigos:
    if (codigosCombinadosSeleccionados.length > 0) {
      serviciosFiltrados = serviciosFiltrados.filter((s) =>
        codigosCombinadosSeleccionados.includes(Number(s.Nro))
      );
    } else {
      // 2. De lo contrario, aplicamos los filtros normales:
      if (departamentoSeleccionado !== "Todos") {
        serviciosFiltrados = serviciosFiltrados.filter(
          (s) => s.Area_IsaGIS_Technologies === departamentoSeleccionado
        );
      }
      if (grupoSeleccionado !== "Todos") {
        serviciosFiltrados = serviciosFiltrados.filter(
          (s) => s.Grupo === grupoSeleccionado
        );
      }
      // Filtro por texto (busqueda) en el campo Nombre_del_Servicio
      if (busqueda) {
        const busquedaLower = busqueda.toLowerCase();
        serviciosFiltrados = serviciosFiltrados.filter((s) =>
          s.Nombre_del_Servicio.toLowerCase().includes(busquedaLower)
        );
      }
    }
  
    // Marcar como seleccionado
    serviciosFiltrados = serviciosFiltrados.map((serv) => ({
      ...serv,
      seleccionado: selectedServiceIds.includes(serv.id),
    }));
  
    setServicios(serviciosFiltrados);
  }, [
    serviciosCargados,
    codigosCombinadosSeleccionados,
    departamentoSeleccionado,
    grupoSeleccionado,
    busqueda,
    selectedServiceIds,
  ]);
  

  //
  // 6. Calcular tiempo y costos
  //
  useEffect(() => {
    const seleccionados = serviciosCargados.filter((s) =>
      selectedServiceIds.includes(s.id)
    )

    if (seleccionados.length === 0) {
      setTiempoTotal(0)
      setCostosTotalesFull1(0)
      setCostosTotalesFull2(0)
      setCostosTotalesPromo1(0)
      setCostosTotalesPromo2(0)
      setCostosTotalesPromo3(0)
      return
    }

    // Sumar tiempo
    const totalTE = seleccionados.reduce((sum, s) => sum + (Number(s.Tiempo_dias_habiles) || 0), 0)
    setTiempoTotal(totalTE)

    // Sumar Basicos, Intermedios, Avanzados
    const totalBasicos = seleccionados.reduce((sum, s) => sum + (Number(s.Basicos) || 0), 0)
    const totalIntermedios = seleccionados.reduce((sum, s) => sum + (Number(s.Intermedios) || 0), 0)
    const totalAvanzados = seleccionados.reduce((sum, s) => sum + (Number(s.Avanzados) || 0), 0)

    // Función getCostoBase
    const getCostoBase = (tipo: string, modalidad: string): number => {
      const costoExacto = costosBase.find(
        (c) => c.Tipo_de_Servicio === tipo && c.Modalidad_de_Contrato === modalidad
      )
      return costoExacto ? costoExacto.Costos_Base : 0
    }

    // Full 1
    const totalFull1 =
      totalBasicos * getCostoBase("Basico", "Full 1") +
      totalIntermedios * getCostoBase("Intermedio", "Full 1") +
      totalAvanzados * getCostoBase("Avanzado", "Full 1")
    setCostosTotalesFull1(totalFull1)

    // Full 2
    const totalFull2 =
      totalBasicos * getCostoBase("Basico", "Full 2") +
      totalIntermedios * getCostoBase("Intermedio", "Full 2") +
      totalAvanzados * getCostoBase("Avanzado", "Full 2")
    setCostosTotalesFull2(totalFull2)

    // Promo 1
    const totalPromo1 =
      totalBasicos * getCostoBase("Basico", "Promo 1") +
      totalIntermedios * getCostoBase("Intermedio", "Promo 1") +
      totalAvanzados * getCostoBase("Avanzado", "Promo 1")
    setCostosTotalesPromo1(totalPromo1)

    // Promo 2
    const totalPromo2 =
      totalBasicos * getCostoBase("Basico", "Promo 2") +
      totalIntermedios * getCostoBase("Intermedio", "Promo 2") +
      totalAvanzados * getCostoBase("Avanzado", "Promo 2")
    setCostosTotalesPromo2(totalPromo2)

    // Promo 3
    const totalPromo3 =
      totalBasicos * getCostoBase("Basico", "Promo 3") +
      totalIntermedios * getCostoBase("Intermedio", "Promo 3") +
      totalAvanzados * getCostoBase("Avanzado", "Promo 3")
    setCostosTotalesPromo3(totalPromo3)

    setIndiceDetalleActual(0)
  }, [servicios, costosBase])

  //
  // Limpiar selección
  //
  const limpiarSeleccion = () => {
    setSelectedServiceIds([])
    setBusqueda("")
    setFiltroCombinado("") // Esto reiniciará el <select> de combinados
    setDepartamentoSeleccionado("Todos")
    setGrupoSeleccionado("Todos")

    // Limpia la lista de códigos del combinado
    setCodigosCombinadosSeleccionados([])

    setServicios(serviciosCargados) // Restaura la lista completa del catálogo
  }

  const toggleServicio = (id: number) => {
    let nuevosIDs = [...selectedServiceIds]
    if (nuevosIDs.includes(id)) {
      nuevosIDs = nuevosIDs.filter((sid) => sid !== id)
    } else {
      nuevosIDs.push(id)
    }
    setSelectedServiceIds(nuevosIDs)
  }

  // Para Detalles
  const serviciosSeleccionados = serviciosCargados.filter((s) =>
    selectedServiceIds.includes(s.id)
  )
  const avanzarDetalle = () => {
    if (serviciosSeleccionados.length > 0) {
      setIndiceDetalleActual((prev) => (prev + 1) % serviciosSeleccionados.length)
    }
  }
  const retrocederDetalle = () => {
    if (serviciosSeleccionados.length > 0) {
      setIndiceDetalleActual(
        (prev) => (prev - 1 + serviciosSeleccionados.length) % serviciosSeleccionados.length
      )
    }
  }

  const reintentarCarga = () => {
    cargarDatos()
  }

  const formatearMoneda = (valor: number): string => {
    return valor.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }
  const calcularDescuento = (costoOriginal: number, costoConDescuento: number): number => {
    return costoOriginal - costoConDescuento
  }

  //
  // 8. Cargar y agrupar Servicios Combinados por Nombre_Servicio_Combinado
  //
  useEffect(() => {
    fetch("https://raw.githubusercontent.com/erasocesar/GeoJSONs/refs/heads/main/Servicios_Combinados.geojson")
      .then((res) => res.json())
      .then((data) => {
        // Diccionario: { Nombre_Servicio_Combinado: number[] }
        const grouped: { [key: string]: number[] } = {}
        data.features.forEach((f: any) => {
          const nombre = f.properties.Nombre_Servicio_Combinado
          const codigo = Number(f.properties.Codigo_Servicio_SIG) // forzamos a number
          if (!grouped[nombre]) {
            grouped[nombre] = []
          }
          grouped[nombre].push(codigo)
        })
        setMapCombinados(grouped)
      })
      .catch((err) => {
        console.error("Error al cargar Servicios Combinados:", err)
      })
  }, [])

  //
  // 9. Filtrar el Catálogo cuando se seleccione un Servicio Combinado
  //
  const filtrarCatalogoPorCombinado = (nombreCombinado: string) => {
    // Buscamos el array de códigos que corresponde a ese Nombre_Servicio_Combinado
    const codigos = mapCombinados[nombreCombinado] || []
    if (!codigos.length) return

    // Filtramos el Catálogo para ver qué servicios tienen un Nro (convertido a number) que esté en codigos
    const serviciosCoincidentes = serviciosCargados.filter((s) =>
      codigos.includes(Number(s.Nro))
    )

    // Extraemos los IDs
    const idsCoincidentes = serviciosCoincidentes.map((s) => s.id)

    // Actualizamos la selección agregando esos IDs
    setSelectedServiceIds((prev) => Array.from(new Set([...prev, ...idsCoincidentes])))

    // Guardar los códigos numéricos en el nuevo estado
    setCodigosCombinadosSeleccionados(codigos)

    // Setear el nombre del combinado en filtroCombinado (para controlar el <select>)
    setFiltroCombinado(nombreCombinado)
  }

  //
  // Botón “Seleccionar Todos”
  //
  const handleSeleccionarTodos = () => {
    const allVisibleIDs = servicios.map((s) => s.id)
    setSelectedServiceIds((prev) => {
      const newSet = new Set([...prev, ...allVisibleIDs])
      return Array.from(newSet)
    })
  }

  //
  // Render principal
  //
  return (
    <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-800 overflow-hidden">
      <div className="p-6">
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-[#e0b400] mb-4 text-center">
            Simulador de Costos
          </h3>
          <p className="text-gray-300 mb-4">
            Selecciona los servicios que necesitas y obtén una estimación de
            costos según diferentes modalidades de contratación.
          </p>
        </div>

        {/* Filtros y buscadores en una misma fila */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Filtro por Departamento */}
          <div className="relative">
            <label htmlFor="departamento-filter" className="block text-sm font-medium text-gray-400 mb-2">
              Filtrar por Departamento
            </label>
            <div className="relative">
              <select
                id="departamento-filter"
                value={departamentoSeleccionado}
                onChange={(e) => setDepartamentoSeleccionado(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#00B2FF]"
                disabled={cargando || error !== null}
              >
                <option value="Todos">Todos</option>
                {departamentosFiltro.map((dep) => (
                  <option key={dep} value={dep}>
                    {dep}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
                size={16}
              />
            </div>
          </div>

          {/* Filtro por Grupo */}
          <div className="relative">
            <label htmlFor="grupo-filter" className="block text-sm font-medium text-gray-400 mb-2">
              Filtrar por Grupo
            </label>
            <div className="relative">
              <select
                id="grupo-filter"
                value={grupoSeleccionado}
                onChange={(e) => setGrupoSeleccionado(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#00B2FF]"
                disabled={cargando || error !== null}
              >
                <option value="Todos">Todos</option>
                {gruposFiltro.map((grp) => (
                  <option key={grp} value={grp}>
                    {grp}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
                size={16}
              />
            </div>
          </div>

          {/* Buscador de Servicios Combinados (dropdown) */}
          <div className="relative">
            <label htmlFor="combinado-dropdown" className="block text-sm font-medium text-gray-400 mb-2">
              Buscador de Servicios Combinados
            </label>
            <div className="relative">
              <select
                id="combinado-dropdown"
                value={filtroCombinado}
                onChange={(e) => {
                  const selectedValue = e.target.value
                  if (selectedValue !== "") {
                    filtrarCatalogoPorCombinado(selectedValue)
                  } else {
                    // Si el usuario vuelve al placeholder en blanco, limpiamos
                    setCodigosCombinadosSeleccionados([])
                    setFiltroCombinado("")
                  }
                }}
                className="w-full px-4 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#00B2FF]"
              >
                <option value="">-- Seleccione un Servicio Combinado --</option>
                {Object.keys(mapCombinados).map((nombreCombinado) => (
                  <option key={nombreCombinado} value={nombreCombinado}>
                    {nombreCombinado}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
                size={16}
              />
            </div>
          </div>

          {/* Buscador de Servicios normal */}
          <div className="relative">
            <label htmlFor="search-services" className="block text-sm font-medium text-gray-400 mb-2">
              Buscador de Servicios
            </label>
            <div className="relative">
              <input
                id="search-services"
                type="text"
                placeholder="Buscar por nombre o descripción..."
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value)
                  // Si el usuario escribe manualmente, limpiamos el combinado:
                  setFiltroCombinado("")
                  setCodigosCombinadosSeleccionados([])
                }}
                className="w-full px-4 py-2 pl-10 bg-gray-800 text-white border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00B2FF]"
                disabled={cargando || error !== null}
              />
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={16}
              />
            </div>
          </div>
        </div>

        {/* Indicadores */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-800 p-3 rounded-lg flex items-center justify-between">
            <span className="text-sm text-gray-400">Servicios Seleccionados</span>
            <span className="text-lg font-semibold text-[#00B2FF]">
  {selectedServiceIds.length}
</span>
          </div>
          <div className="bg-gray-800 p-3 rounded-lg flex items-center justify-between">
            <span className="text-sm text-gray-400">Servicios Disponibles</span>
            <span className="text-lg font-semibold text-white">
              {servicios.length}
            </span>
          </div>
        </div>

        {/* Sección principal: Catálogo + Detalles + Resumen */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Columna izquierda */}
          <div>
            {/* Catálogo de Servicios */}
            <div className="bg-gray-800 rounded-lg p-2">
              <h3 className="text-lg font-semibold text-[#e0b400] text-center">
                Catálogo de Servicios
              </h3>
            </div>
            <div className="bg-gray-800 rounded-lg mt-1 p-4 h-96 overflow-y-auto">
              {cargando ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <div className="w-12 h-12 border-4 border-[#00B2FF] border-t-transparent rounded-full animate-spin"></div>
                  <p className="mt-4 text-gray-400">Cargando servicios...</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-64 text-red-500">
                  <p className="text-center mb-4">Error al cargar los servicios:</p>
                  <p className="text-center mb-2">{error}</p>
                  <button
                    onClick={reintentarCarga}
                    className="mt-4 px-4 py-2 bg-[#00B2FF] text-white rounded-lg"
                  >
                    Reintentar
                  </button>
                </div>
              ) : servicios.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                  <Filter className="h-12 w-12 mb-2 opacity-50" />
                  <p>No se encontraron servicios con los filtros actuales</p>
                  <button
                    onClick={() => {
                      setDepartamentoSeleccionado("Todos")
                      setGrupoSeleccionado("Todos")
                      setBusqueda("")
                      setFiltroCombinado("")
                      setCodigosCombinadosSeleccionados([])
                    }}
                    className="mt-2 text-[#00B2FF] hover:underline"
                  >
                    Limpiar filtros
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {servicios.map((serv) => (
                    <div
                      key={serv.id}
                      className={`p-3 rounded-lg cursor-pointer transition-all ${
                        serv.seleccionado
                          ? "bg-[#00B2FF]/20 border border-[#00B2FF]"
                          : "bg-gray-700 border border-gray-700 hover:border-gray-500"
                      }`}
                      onClick={() => toggleServicio(serv.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="w-full">
                          <h4 className="font-medium text-white text-sm">
                            {serv.Nombre_del_Servicio}
                          </h4>
                          <p className="text-xs text-gray-400">{serv.descripcion}</p>
                          <div className="mt-2 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="flex items-center">
                                <span className="text-[#00c5ff] text-xs mr-1">Código del Servicio:</span>
                                <span className="text-[#a8a8a8] text-xs">{serv.Nro}</span>
                              </div>
                              <div className="flex items-center">
                                <span className="text-[#00c5ff] text-xs mr-1">Área:</span>
                                <span className="text-[#a8a8a8] text-xs">{serv.Area_IsaGIS_Technologies}</span>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[#00c5ff] text-xs mr-1">Costo Base:</span>
                              <span className="text-[#ffffff] text-xs mr-2">
                                Und Basicas: {serv.Basicos}
                              </span>
                              <span className="text-[#ffffff] text-xs mr-2">
                                Und Intermedias: {serv.Intermedios}
                              </span>
                              <span className="text-[#ffffff] text-xs">
                                Und Avanzadas: {serv.Avanzados}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 text-gray-400 mr-1" />
                              <span className="text-[#a8a8a8] text-xs">
                                {serv.Tiempos_de_entrega}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ml-2 ${
                            serv.seleccionado ? "bg-[#00B2FF]" : "bg-gray-600"
                          }`}
                        >
                          {serv.seleccionado && <Check className="h-3 w-3 text-white" />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Botones Limpiar Selección y Seleccionar Todos */}
            <div className="my-4 text-center flex gap-2">
              <button
                onClick={limpiarSeleccion}
                className="w-full bg-[#00B2FF] hover:bg-[#00B2FF]/90 text-white font-bold py-3 px-4 rounded-lg transition-colors"
              >
                Limpiar Selección
              </button>
              <button
                onClick={handleSeleccionarTodos}
                className="w-full bg-[#00B2FF] hover:bg-[#00B2FF]/90 text-white font-bold py-3 px-4 rounded-lg transition-colors"
              >
                Seleccionar Todos
              </button>
            </div>

            {/* Widget: Detalles Adicionales */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-[#e0b400] mb-4 text-center">
                Detalles Adicionales de los Servicios Seleccionados
              </h3>
              {serviciosSeleccionados.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-[#00b2ff]">
                  <p>Seleccione un servicio en el Catálogo de Servicios</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="flex justify-center items-center mb-4 text-sm text-gray-400">
                    <button
                      onClick={retrocederDetalle}
                      className="p-1 rounded-full bg-gray-700 hover:bg-gray-600 mr-2"
                      disabled={serviciosSeleccionados.length <= 1}
                    >
                      <ChevronLeft size={16} className="text-gray-300" />
                    </button>
                    <span>
                      {indiceDetalleActual + 1} de {serviciosSeleccionados.length}
                    </span>
                    <button
                      onClick={avanzarDetalle}
                      className="p-1 rounded-full bg-gray-700 hover:bg-gray-600 ml-2"
                      disabled={serviciosSeleccionados.length <= 1}
                    >
                      <ChevronRight size={16} className="text-gray-300" />
                    </button>
                  </div>

                  <div className="space-y-4 overflow-y-auto max-h-[200px] pr-1">
                    <div>
                      <h4 className="text-sm text-gray-400">Nombre del Servicio</h4>
                      <p className="text-white text-sm break-words">
                        {serviciosSeleccionados[indiceDetalleActual]?.Nombre_del_Servicio}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm text-gray-400">Descripción Técnica del Servicio</h4>
                      <p className="text-white text-sm break-words">
                        {serviciosSeleccionados[indiceDetalleActual]?.Descripción_Técnica_del_Servicio}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm text-gray-400">Detalles del Costo Base</h4>
                      <p className="text-white text-sm break-words">
                        {serviciosSeleccionados[indiceDetalleActual]?.Detalles_Costo_Base}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm text-gray-400">Notas Adicionales</h4>
                      <p className="text-white text-sm break-words">
                        {serviciosSeleccionados[indiceDetalleActual]?.Notas_Adicionales}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Columna derecha: Resumen de tu solución */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-[#e0b400] mb-4 text-center">
              Resumen de tu solución
            </h3>
            <div className="space-y-6">
              {/* Lista de servicios seleccionados y Tiempo Estimado */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 max-h-40 overflow-y-auto">
                  <h4 className="text-[#00b2ff] mb-2">Servicios seleccionados</h4>
                  {serviciosSeleccionados.length === 0 ? (
                    <p className="text-gray-500 italic">Ningún servicio seleccionado</p>
                  ) : (
                    <ul className="space-y-1">
                      {serviciosSeleccionados.map((s) => (
                        <li key={s.id} className="flex items-center text-gray-300">
                          <Check className="h-4 w-4 text-[#00B2FF] mr-2 flex-shrink-0" />
                          <span className="truncate">{s.Nombre_del_Servicio}</span>
                          <span className="ml-2 text-xs text-gray-400">({s.Subgrupo})</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="md:w-1/3 bg-gray-700 p-4 rounded-lg h-fit">
                  <h4 className="text-gray-400 text-sm mb-1">Tiempo Estimado</h4>
                  <p className="text-xl font-bold text-white">
                    {tiempoTotal.toFixed(1)} días
                  </p>
                </div>
              </div>

              {/* Costos por modalidad */}
              <div>
                <h4 className="text-[#00b2ff] mb-3">Costos por modalidad de contratación</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Full 1 */}
                  <div className="bg-gray-700 p-3 rounded-lg">
                    <h5 className="text-sm font-medium text-white mb-1">
                      Full (Sin Contrato - Pago Anticipado)
                    </h5>
                    <p className="text-xs text-gray-400 mb-2">Pago anticipado por servicio</p>
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-white">
                        {formatearMoneda(costosTotalesFull1)}
                      </span>
                      <span className="text-xs bg-gray-600 text-gray-300 px-2 py-0.5 rounded-full">
                        Descuento: $0
                      </span>
                    </div>
                  </div>
                  {/* Full 2 */}
                  <div className="bg-gray-700 p-3 rounded-lg">
                    <h5 className="text-sm font-medium text-white mb-1">
                      Full (Firmando Contrato - Pago Mensual)
                    </h5>
                    <p className="text-xs text-gray-400 mb-2">Facturación mensual sin consumo mínimo</p>
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-white">
                        {formatearMoneda(costosTotalesFull2)}
                      </span>
                      {costosTotalesFull1 > 0 && (
                        <span className="text-xs bg-green-900 text-green-300 px-2 py-0.5 rounded-full">
                          Descuento: {formatearMoneda(costosTotalesFull1 - costosTotalesFull2)}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Promo 1 */}
                  <div className="bg-gray-700 p-3 rounded-lg">
                    <h5 className="text-sm font-medium text-white mb-1">
                      Promo 1 (Pequeñas Empresas)
                    </h5>
                    <p className="text-xs text-gray-400 mb-2">Consumo mínimo $3.5M + IVA</p>
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-white">
                        {formatearMoneda(costosTotalesPromo1)}
                      </span>
                      {costosTotalesFull1 > 0 && (
                        <span className="text-xs bg-green-900 text-green-300 px-2 py-0.5 rounded-full">
                          Descuento: {formatearMoneda(costosTotalesFull1 - costosTotalesPromo1)}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Promo 2 */}
                  <div className="bg-gray-700 p-3 rounded-lg">
                    <h5 className="text-sm font-medium text-white mb-1">
                      Promo 2 (Medianas Empresas)
                    </h5>
                    <p className="text-xs text-gray-400 mb-2">Consumo mínimo $7M + IVA</p>
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-white">
                        {formatearMoneda(costosTotalesPromo2)}
                      </span>
                      {costosTotalesFull1 > 0 && (
                        <span className="text-xs bg-green-900 text-green-300 px-2 py-0.5 rounded-full">
                          Descuento: {formatearMoneda(costosTotalesFull1 - costosTotalesPromo2)}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Promo 3 */}
                  <div className="bg-gray-700 p-3 rounded-lg">
                    <h5 className="text-sm font-medium text-white mb-1">
                      Promo 3 (Grandes Empresas)
                    </h5>
                    <p className="text-xs text-gray-400 mb-2">Consumo mínimo $12M + IVA</p>
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-white">
                        {formatearMoneda(costosTotalesPromo3)}
                      </span>
                      {costosTotalesFull1 > 0 && (
                        <span className="text-xs bg-green-900 text-green-300 px-2 py-0.5 rounded-full">
                          Descuento: {formatearMoneda(costosTotalesFull1 - costosTotalesPromo3)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Nota Importante */}
              <div className="bg-gray-700 p-3 rounded-lg">
                <h4 className="text-[#e0b400] text-sm font-medium mb-2">
                  Nota Importante:
                </h4>
                <p className="text-sm text-gray-300">
                  Los costos de cada modalidad se calculan con base en la información mostrada en{" "}
                  <span className="text-[#00B2FF] font-semibold">
                    Detalles Adicionales de los Servicios Seleccionados
                  </span>
                  , específicamente en{" "}
                  <span className="text-[#00B2FF] font-semibold">
                    Detalles del Costo Base y Notas Adicionales
                  </span>
                  . Además, se incluye la{" "}
                  <span className="text-[#00B2FF] font-semibold">
                    Descripción Técnica
                  </span>{" "}
                  de cada servicio.
                  <br />
                  Si sus requerimientos difieren de lo mostrado, solicite una reunión para utilizar nuestro{" "}
                  <span className="text-[#00B2FF] font-semibold">
                    algoritmo avanzado de Costos
                  </span>.
                </p>
              </div>

              {/* Botón Solicitar Cotización */}
              <a
                href="https://survey123.arcgis.com/share/cdebcc29648447018f0dd781f7f94c5b"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-[#00B2FF] hover:bg-[#00B2FF]/90 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
              >
                Solicitar Cotización Detallada
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
