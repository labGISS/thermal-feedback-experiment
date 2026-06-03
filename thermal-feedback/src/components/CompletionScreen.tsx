export const CompletionScreen = () => {
  return (
    <div className="flex-1 flex items-center justify-center px-5 py-10">
      <div className="max-w-xl w-full text-center mx-auto">
        <h1 className="text-3xl font-semibold mb-6 text-primary">
          Tutti gli Esperimenti Completati
        </h1>
        <p className="text-lg text-gray-500 mb-4 leading-relaxed">
          Grazie per aver partecipato a tutti e tre gli esperimenti.
        </p>
        <p className="text-lg text-gray-500 leading-relaxed">
          Il tuo riscontro è stato registrato.
        </p>
      </div>
    </div>
  );
};
