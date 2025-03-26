import SimuladorCostos from "@/components/servicios-combinados-calculadora"

export default function Home() {
  return (
    <main className="min-h-screen bg-black p-8">
      <div className="container mx-auto">
        <SimuladorCostos />
      </div>
    </main>
  )
}

