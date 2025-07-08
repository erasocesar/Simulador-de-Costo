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

  /* ----------------------------------------------------------------------
   * 1. Cargar Catálogo de Servicios (ArcGIS Online)
   * --------------------------------------------------------------------*/
  const cargarDatos = async () => {
    try {
      setCargando(true)
      setError(null)
      const url =
        "https://raw.githubusercontent.com/erasocesar/GeoJSONs/refs/heads/main/Catalogo_de_Servicios.geojson"
      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-cache"
      })
      if (!response.ok) {
        throw new Error(`Error en la respuesta: ${response.status} ${response.statusText}`)
      }
      const data = await response.json()
      if (!data.features || !Array.isArray(data.features)) {
        throw new Error("No se encontraron features en la respuesta")
      }

      const serviciosFormateados: Servicio[] = data.features.map(
        (feature: any, index: number) => {
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
            Tiempo_dias_habiles: parseFloat(
              String(attrs.Tiempo__Dias_habiles_ || "0").replace(",", ".")
            ),
            Detalles_Costo_Base: attrs.Detalles_Costo_Base || "Sin detalles",
            Notas_Adicionales: attrs.Notas_Adicionales || "Sin notas adicionales",
            Descripción_Técnica_del_Servicio:
              attrs["Descripción_Técnica_del_Servicio"] || "",
            costoBase: typeof attrs.costoBase === "number" ? attrs.costoBase : 0,
            seleccionado: selectedServiceIds.includes(index + 1)
          }
        }
      )

      const filtrados = serviciosFormateados.filter(
        (s) => s.Area_IsaGIS_Technologies !== "Uso Interno IsaGIS"
      )
      setServiciosCargados(filtrados)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido al cargar Catálogo")
      setServiciosCargados([])
    } finally {
      setCargando(false)
    }
  }

  /* ----------------------------------------------------------------------
   * 2. Cargar Costos Base (ArcGIS Online)
   * --------------------------------------------------------------------*/
  useEffect(() => {
    const cargarCostosBase = async () => {
      try {
        const url =
          "https://raw.githubusercontent.com/erasocesar/GeoJSONs/refs/heads/main/Tabla_Costos_Base.geojson"
        const response = await fetch(url, {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-cache"
        })
        if (!response.ok) {
          throw new Error(
            `Error en la respuesta Costos Base: ${response.status} ${response.statusText}`
          )
        }
        const data = await response.json()
        if (!data.features || !Array.isArray(data.features)) {
          throw new Error("No se encontraron features en la respuesta de Costos Base")
        }
        const costosFormateados = data.features.map((feature: any, index: number) => {
          const attrs = feature.properties || {}
          return {
            id: index + 1,
            Tipo_de_Servicio: attrs.Tipo_de_Servicio || "",
            Modalidad_de_Contrato: attrs.Modalidad_de_Contrato || "",
            Costos_Base: typeof attrs.Costos_Base === "number" ? attrs.Costos_Base : 0
          }
        })
        setCostosBase(costosFormateados)
      } catch (err) {
        console.error("Error al cargar Costos Base:", err)
        setError(err instanceof Error ? err.message : "Error desconocido al cargar Costos Base")
      }
    }
    cargarCostosBase()
  }, [])

  /* ----------------------------------------------------------------------
   * 3. Cargar Catálogo al iniciar
   * --------------------------------------------------------------------*/
  useEffect(() => {
    cargarDatos()
  }, [])

  /* ----------------------------------------------------------------------
   * 4. Cargar combos (Departamento, Grupo)
   * --------------------------------------------------------------------*/
  useEffect(() => {
    fetch(
      "https://raw.githubusercontent.com/erasocesar/GeoJSONs/refs/heads/main/Grupos_Servicios.geojson"
    )
      .then((res) => res.json())
      .then((data) => {
        const depOptions = Array.from(
          new Set(data.features.map((f: any) => f.properties.Area_Estrategica))
        )
        setDepartamentosFiltro(depOptions)

        const grpOptions = Array.from(
          new Set(data.features.map((f: any) => f.properties.Grupo))
        )
        setGruposFiltro(grpOptions)
      })
      .catch((err) => console.error("Error al cargar combos (GeoJSON):", err))
  }, [])

  // Actualizar combos de Grupo al cambiar Departamento
  useEffect(() => {
    fetch(
      "https://raw.githubusercontent.com/erasocesar/GeoJSONs/refs/heads/main/Grupos_Servicios.geojson"
    )
      .then((res) => res.json())
      .then((data) => {
        if (departamentoSeleccionado === "Todos") {
          const grpOptions = Array.from(
            new Set(data.features.map((f: any) => f.properties.Grupo))
          )
          setGruposFiltro(grpOptions)
        } else {
          const filtered = data.features.filter(
            (f: any) => f.properties.Area_Estrategica === departamentoSeleccionado
          )
          const grpOptions = Array.from(
            new Set(filtered.map((f: any) => f.properties.Grupo))
          )
          setGruposFiltro(grpOptions)

          if (!grpOptions.includes(grupoSeleccionado)) {
            setGrupoSeleccionado("Todos")
          }
        }
      })
      .catch((err) => console.error("Error actualizando combos de Grupo:", err))
  }, [departamentoSeleccionado, grupoSeleccionado])

  /* ----------------------------------------------------------------------
   * 5. Filtros del Catálogo (ahora insensible a acentos/mayúsculas
   *    y también busca en la descripción técnica)
   * --------------------------------------------------------------------*/
  useEffect(() => {
    const normalizar = (str: string) =>
      str
        ? str
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
        : ""

    let serviciosFiltrados = [...serviciosCargados]

    if (codigosCombinadosSeleccionados.length > 0) {
      serviciosFiltrados = serviciosFiltrados.filter((s) =>
        codigosCombinadosSeleccionados.includes(Number(s.Nro))
      )
    } else {
      if (departamentoSeleccionado !== "Todos") {
        serviciosFiltrados = serviciosFiltrados.filter(
          (s) => s.Area_IsaGIS_Technologies === departamentoSeleccionado
        )
      }
      if (grupoSeleccionado !== "Todos") {
        serviciosFiltrados = serviciosFiltrados.filter((s) => s.Grupo === grupoSeleccionado)
      }

      if (busqueda) {
        const busquedaNormalizada = normalizar(busqueda)
        serviciosFiltrados = serviciosFiltrados.filter((s) => {
          return (
            normalizar(s.Nombre_del_Servicio).includes(busquedaNormalizada) ||
            normalizar(s.Descripción_Técnica_del_Servicio || "").includes(
              busquedaNormalizada
            )
          )
        })
      }
    }

    serviciosFiltrados = serviciosFiltrados.map((serv) => ({
      ...serv,
      seleccionado: selectedServiceIds.includes(serv.id)
    }))

    setServicios(serviciosFiltrados)
  }, [
    serviciosCargados,
    codigosCombinadosSeleccionados,
    departamentoSeleccionado,
    grupoSeleccionado,
    busqueda,
    selectedServiceIds
  ])

  /* ----------------------------------------------------------------------
   * 6. Calcular tiempo y costos
   * --------------------------------------------------------------------*/
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

    const totalTE = seleccionados.reduce(
      (sum, s) => sum + (Number(s.Tiempo_dias_habiles) || 0),
      0
    )
    setTiempoTotal(totalTE)

    const totalBasicos = seleccionados.reduce(
      (sum, s) => sum + (Number(s.Basicos) || 0),
      0
    )
    const totalIntermedios = seleccionados.reduce(
      (sum, s) => sum + (Number(s.Intermedios) || 0),
      0
    )
    const totalAvanzados = seleccionados.reduce(
      (sum, s) => sum + (Number(s.Avanzados) || 0),
      0
    )

    const getCostoBase = (tipo: string, modalidad: string): number => {
      const costoExacto = costosBase.find(
        (c) => c.Tipo_de_Servicio === tipo && c.Modalidad_de_Contrato === modalidad
      )
      return costoExacto ? costoExacto.Costos_Base : 0
    }

    const totalFull1 =
      totalBasicos * getCostoBase("Basico", "Full 1") +
      totalIntermedios * getCostoBase("Intermedio", "Full 1") +
      totalAvanzados * getCostoBase("Avanzado", "Full 1")
    setCostosTotalesFull1(totalFull1)

    const totalFull2 =
      totalBasicos * getCostoBase("Basico", "Full 2") +
      totalIntermedios * getCostoBase("Intermedio", "Full 2") +
      totalAvanzados * getCostoBase("Avanzado", "Full 2")
    setCostosTotalesFull2(totalFull2)

    const totalPromo1 =
      totalBasicos * getCostoBase("Basico", "Promo 1") +
      totalIntermedios * getCostoBase("Intermedio", "Promo 1") +
      totalAvanzados * getCostoBase("Avanzado", "Promo 1")
    setCostosTotalesPromo1(totalPromo1)

    const totalPromo2 =
      totalBasicos * getCostoBase("Basico", "Promo 2") +
      totalIntermedios * getCostoBase("Intermedio", "Promo 2") +
      totalAvanzados * getCostoBase("Avanzado", "Promo 2")
    setCostosTotalesPromo2(totalPromo2)

    const totalPromo3 =
      totalBasicos * getCostoBase("Basico", "Promo 3") +
      totalIntermedios * getCostoBase("Intermedio", "Promo 3") +
      totalAvanzados * getCostoBase("Avanzado", "Promo 3")
    setCostosTotalesPromo3(totalPromo3)

    setIndiceDetalleActual(0)
  }, [servicios, costosBase])

  /* ----------------------------------------------------------------------
   * Funciones auxiliares / UI helpers
   * --------------------------------------------------------------------*/
  const limpiarSeleccion = () => {
    setSelectedServiceIds([])
    setBusqueda("")
    setFiltroCombinado("")
    setDepartamentoSeleccionado("Todos")
    setGrupoSeleccionado("Todos")
    setCodigosCombinadosSeleccionados([])
    setServicios(serviciosCargados)
  }

  const toggleServicio = (id: number) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    )
  }

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

  const reintentarCarga = () => cargarDatos()

  const formatearMoneda = (valor: number): string =>
    valor.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  const handleSeleccionarTodos = () => {
    const allVisibleIDs = servicios.map((s) => s.id)
    setSelectedServiceIds((prev) => Array.from(new Set([...prev, ...allVisibleIDs])))
  }

  /* ----------------------------------------------------------------------
   * Render
   * --------------------------------------------------------------------*/
  return (
    /* ... (el mismo JSX que tenías previamente – sin cambios) ... */
    <>Reemplaza este fragmento con tu JSX existente (no ha cambiado structurally)</>
  )
}
