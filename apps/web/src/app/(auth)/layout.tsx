

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <main className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <section className="flex items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
                    {children}
            </section>
        </main>
    )
}
