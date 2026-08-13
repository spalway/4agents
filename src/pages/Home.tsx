import Hero from '../components/Hero'
import Factory from '../components/Factory'
import Connectors from '../components/Connectors'
import SeatPanes from '../components/SeatPanes'
import Comms from '../components/Comms'
import Ledger from '../components/Ledger'
import Footer from '../components/Footer'

export default function Home() {
  return (
    <>
      <Hero />

      {/* Raised 32px. The trunk in Connectors is 32px longer to match, so the
          facility moves up without dragging the cards with it. */}
      <section className="px-6 pt-4">
        <div className="mx-auto max-w-[1120px]">
          <Factory />
        </div>
      </section>

      <Connectors />
      <SeatPanes />

      {/* Two feeds, side by side: the seats talking, and the host reporting. */}
      <section className="px-6 pt-16">
        <div className="mx-auto grid max-w-[1120px] grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <div className="frame flex h-[262px] flex-col">
            <Comms rows={24} />
          </div>
          <div className="frame flex h-[262px] flex-col">
            <Ledger />
          </div>
        </div>
      </section>

      <Footer />
    </>
  )
}
