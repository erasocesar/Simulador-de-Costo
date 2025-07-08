"use client"

import { useState, useEffect } from "react"
import {
  Search,
  Check,
  Clock,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

// ---------------- Tipos -----------------
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

// ---------- Herramienta auxiliar ----------
const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()

// ----------- Componente principal ---------------
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
  const [filtroCombinado, setFiltroCombinado] = useState("")
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
  const [mapCombinados, setMapCombinados] = useState<{ [key: string]: number[] }>({})

  //--------------------------------------------------------------------
  // 1. Cargar Catálogo de Servicios
  //--------------------------------------------------------------------
  const cargarDatos = async () => {
    try {
      setCargando(true)
      setError(null)
      const url =
        "https://raw.githubusercontent.com/erasocesar/GeoJSONs/refs/heads/main/Catalogo_de_Servicios.geojson"
      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-cache",
      })
      if (!response.ok) throw new Error(`Error ${response.status}`)
      const data = await response.json()
      if (!Array.isArray(data.features)) throw new Error("Sin features")

      const serviciosFormateados: Servicio[] = data.features.map((f: any, i: number) => {
        const p = f.properties || {}
        return {
          id: i + 1,
          Nro: p.Nro || `SRV${String(i + 1).padStart(3, "0")}`,
          Nombre_del_Servicio: p.Nombre_del_Servicio || "Servicio sin nombre",
          Area_IsaGIS_Technologies: p.Area_IsaGIS_Technologies || "Sin área",
          Grupo: p.Grupo || "Sin grupo",
          Subgrupo: p.Subgrupo || "Sin subgrupo",
          descripcion: p.descripcion || "",
          Basicos: Number(p.Basicos) || 0,
          Intermedios: Number(p.Intermedios) || 0,
          Avanzados: Number(p.Avanzados) || 0,
          Tiempos_de_entrega: p.Tiempos_de_entrega || "N/A",
          Tiempo_dias_habiles: parseFloat(String(p.Tiempo__Dias_habiles_ || "0").replace(",", ".")),
          Detalles_Costo_Base: p.Detalles_Costo_Base || "Sin detalles",
          Notas_Adicionales: p.Notas_Adicionales || "Sin notas",
          Descripción_Técnica_del_Servicio: p["Descripción_Técnica_del_Servicio"] || "",
          costoBase: Number(p.costoBase) || 0,
          seleccionado: false,
        }
      })

      setServiciosCargados(
        serviciosFormateados.filter((s) => s.Area_IsaGIS_Technologies !== "Uso Interno IsaGIS")
      )
    } catch (e: any) {
      setError(e.message)
      setServiciosCargados([])
    } finally {
      setCargando(false)
    }
  }

  //--------------------------------------------------------------------
  // 2. Cargar Costos Base
  //--------------------------------------------------------------------
  useEffect(() => {
    const cargarCostos = async () => {
      try {
        const url =
          "https://raw.githubusercontent.com/erasocesar/GeoJSONs/refs/heads/main/Tabla_Costos_Base.geojson"
        const r = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-cache" })
        if (!r.ok) throw new Error("Error costos base")
        const d = await r.json()
        if (!Array.isArray(d.features)) throw new Error("Sin features costos base")
        const arr: CostoBase[] = d.features.map((f: any, i: number) => {
          const p = f.properties || {}
          return {
            id: i + 1,
            Tipo_de_Servicio: p.Tipo_de_Servicio || "",
            Modalidad_de_Contrato: p.Modalidad_de_Contrato || "",
            Costos_Base: Number(p.Costos_Base) || 0,
          }
        })
        setCostosBase(arr)
      } catch (e) {
        console.error(e)
      }
    }
    cargarCostos()
  }, [])

  //--------------------------------------------------------------------
  // 3. Cargar combos Departamento / Grupo
  //--------------------------------------------------------------------
  useEffect(() => {
    fetch(
      "https://raw.githubusercontent.com/erasocesar/GeoJSONs/refs/heads/main/Grupos_Servicios.geojson"
    )
      .then((r) => r.json())
      .then((d) => {
        const deps = [...new Set(d.features.map((f: any) => f.properties.Area_Estrategica))]
        setDepartamentosFiltro(deps)
        const grps = [...new Set(d.features.map((f: any) => f.properties.Grupo))]
        setGruposFiltro(grps)
      })
      .catch(console.error)
  }, [])

  //--------------------------------------------------------------------
  // 4. Cargar Catálogo al iniciar
  //--------------------------------------------------------------------
  useEffect(cargarDatos, [])

  //--------------------------------------------------------------------
  // 5. Filtro principal (acentos + descripción técnica)
  //--------------------------------------------------------------------
  useEffect(() => {
    let filtrados = [...serviciosCargados]

    if (codigosCombinadosSeleccionados.length) {
      filtrados = filtrados.filter((s) => codigosCombinadosSeleccionados.includes(Number(s.Nro)))
    } else {
      if (departamentoSeleccionado !== "Todos")
        filtrados = filtrados.filter((s) => s.Area_IsaGIS_Technologies === departamentoSeleccionado)
      if (grupoSeleccionado !== "Todos")
        filtrados = filtrados.filter((s) => s.Grupo === grupoSeleccionado)

      if (busqueda) {
        const b = normalizar(busqueda)
        filtrados = filtrados.filter(
          (s) =>
            normalizar(s.Nombre_del_Servicio).includes(b) ||
            normalizar(s.Descripción_Técnica_del_Servicio || "").includes(b)
        )
      }
    }

    setServicios(
      filtrados.map((sv) => ({ ...sv, seleccionado: selectedServiceIds.includes(sv.id) }))
    )
  }, [
    serviciosCargados,
    codigosCombinadosSeleccionados,
    departamentoSeleccionado,
    grupoSeleccionado,
    busqueda,
    selectedServiceIds,
  ])

  //--------------------------------------------------------------------
  // 6. Calcular tiempo y costos (idéntico al original, solo reorganizado)
  //--------------------------------------------------------------------
  useEffect(() => {
    const seleccionados = serviciosCargados.filter((s) => selectedServiceIds.includes(s.id))

    if (!seleccionados.length) {
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

    const totalBasicos = seleccionados.reduce((sum, s) => sum + (Number(s.Basicos) || 0), 0)
    const totalIntermedios = seleccionados.reduce((sum, s) => sum + (Number(s.Intermedios) || 0), 0)
    const totalAvanzados = seleccionados.reduce((sum, s) => sum + (Number(s.Avanzados) || 0), 0)

    const getCostoBase = (tipo: string, modalidad: string): number => {
      const c = costosBase.find(
        (cb) => cb.Tipo_de_Servicio === tipo && cb.Modalidad_de_Contrato === modalidad
      )
      return c ? c.Costos_Base : 0
    }

    const calcTotal = (modalidad: string) =>
      totalBasicos * getCostoBase("Basico", modalidad) +
      totalIntermedios * getCostoBase("Intermedio", modalidad) +
      totalAvanzados * getCostoBase("Avanzado", modalidad)

    setCostosTotalesFull1(calcTotal("Full 1"))
    setCostosTotalesFull2(calcTotal("Full 2"))
    setCostosTotalesPromo1(calcTotal("Promo 1"))
    setCostosTotalesPromo2(calcTotal("Promo 2"))
    setCostosTotalesPromo3(calcTotal("Promo 3"))

    setIndiceDetalleActual(0)
  }, [servicios, costosBase])

  //--------------------------------------------------------------------
  // 7. Resto de funciones auxiliares (toggle, limpiar, etc.)
  //--------------------------------------------------------------------
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

  //--------------------------------------------------------------------
  // 8. Cargar Servicios Combinados (igual que antes)
  //--------------------------------------------------------------------
  useEffect(() => {
    fetch(
      "https://raw.githubusercontent.com/erasocesar/GeoJSONs/refs/heads/main/Servicios_Combinados.geojson"
    )
      .then((r) => r.json())
      .then((d) => {
        const grouped: { [key: string]: number[] } = {}
        d.features.forEach((f: any) => {
          const n = f.properties.Nombre_Servicio_Combinado
          const c = Number(f.properties.Codigo_Servicio_SIG)
          if (!grouped[n]) grouped[n] = []
          grouped[n].push(c)
        })
        setMapCombinados(grouped)
      })
      .catch(console.error)
  }, [])

  const filtrarCatalogoPorCombinado = (nombre: string) => {
    const cods = mapCombinados[nombre] || []
    if (!cods.length) return
    const matches = serviciosCargados.filter((s) => cods.includes(Number(s.Nro)))
    setSelectedServiceIds((prev) => Array.from(new Set([...prev, ...matches.map((s) => s.id)])))
    setCodigosCombinadosSeleccionados(cods)
    setFiltroCombinado(nombre)
  }

  //--------------------------------------------------------------------
  // 9. Render
  //--------------------------------------------------------------------
  const serviciosSeleccionados = serviciosCargados.filter((s) => selectedServiceIds.includes(s.id))

  const formatearMoneda = (v: number) =>
    v.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  return (
    <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-800 overflow-hidden">
      <div className="p-6">
        {/* cabecera */}
        <div className="mb-8 text-center">
          <h3 className="text-xl font-semibold text-[#e0b400] mb-4">Simulador de Costos</h3>
          <p className="text-gray-300">
            Selecciona los servicios que necesitas y obtén una estimación de costos según diferentes modalidades de contratación.
          </p>
        </div>

        {/* filtros */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Departamento */}
          <div className="relative">
            <label className="block text-sm text-gray-400 mb-2">Filtrar por Departamento</label>
            <div className="relative">
              <select
                value={departamentoSeleccionado}
                onChange={(e) => setDepartamentoSeleccionado(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#00B2FF]"
                disabled={cargando || !!error}
              >
                <option value="Todos">Todos</option>
                {departamentosFiltro.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            </div>
          </div>

          {/* Grupo */}
          <div className="relative">
            <label className="block text-sm text-gray-400 mb-2">Filtrar por Grupo</label>
            <div className="relative">
              <select
                value={grupoSeleccionado}
                onChange={(e) => setGrupoSeleccionado(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#00B2FF]"
                disabled={cargando || !!error}
              >
                <option value="Todos">Todos</option>
                {gruposFiltro.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            </div>
          </div>

          {/* Combinados */}
          <div className="relative">
            <label className="block text-sm text-gray-400 mb-2">Buscador de Servicios Combinados</label>
            <div className="relative">
              <select
                value={filtroCombinado}
                onChange={(e) => {
                  if (e.target.value) filtrarCatalogoPorCombinado(e.target.value)
                  else {
                    setCodigosCombinadosSeleccionados([])
                    setFiltroCombinado("")
                  }
                }}
                className="w-full px-4 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#00B2FF]"
              >
                <option value="">-- Seleccione un Servicio Combinado --</option>
                {Object.keys(mapCombinados).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            </div>
          </div>

          {/* Buscador texto */}
          <div className="relative">
            <label className="block text-sm text-gray-400 mb-2">Buscador de Servicios</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar por nombre o descripción..."
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value)
                  setFiltroCombinado("")
                  setCodigosCombinadosSeleccionados([])
                }}
                className="w-full px-4 py-2 pl-10 bg-gray-800 text-white border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00B2FF]"
                disabled={cargando || !!error}
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            </div>
          </div>
        </div>

        {/* Indicadores */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-800 p-3 rounded-lg flex justify-between items-center">
            <span className="text-sm text-gray-400">Servicios Seleccionados</span>
            <span className="text-lg font-semibold text-[#00B2FF]">{selectedServiceIds.length}</span>
          </div>
          <div className="bg-gray-800 p-3 rounded-lg flex justify-between items-center">
            <span className="text-sm text-gray-400">Servicios Disponibles</span>
            <span className="text-lg font-semibold text-white">{servicios.length}</span>
          </div>
        </div>

        {/* Layout principal */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* ---------------- CATÁLOGO (izquierda) ------------- */}
          <div>
            <div className="bg-gray-800 rounded-lg p-2 text-center">
              <h3 className="text-lg font-semibold text-[#e0b400]">Catálogo de Servicios</h3>
            </div>

            <div className="bg-gray-800 rounded-lg mt-1 p-4 h-96 overflow-y-auto">
              {cargando ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <div className="w-12 h-12 border-4 border-[#00B2FF] border-t-transparent rounded-full animate-spin" />
                  <p className="mt-4 text-gray-400">Cargando servicios...</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-64 text-red-500">
                  <p className="mb-2 text-center">{error}</p>
                  <button onClick={cargarDatos} className="px-4 py-2 bg-[#00B2FF] text-white rounded-lg">
                    Reintentar
                  </button>
                </div>
              ) : servicios.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                  <Filter className="h-12 w-12 mb-2 opacity-50" />
                  <p>No se encontraron servicios con los filtros actuales</p>
                  <button onClick={limpiarSeleccion} className="mt-2 text-[#00B2FF] hover:underline">
                    Limpiar filtros
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {servicios.map((s) => (
                    <div
                      key={s.id}
                      className={`p-3 rounded-lg cursor-pointer transition-all ${
