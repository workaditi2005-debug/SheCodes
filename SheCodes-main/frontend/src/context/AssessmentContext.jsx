/**
 * AssessmentContext v3
 * Holds raw data from all 5 test modules + API response.
 */
import { createContext, useContext, useState } from "react";

const Ctx = createContext(null);

export function AssessmentProvider({ children }) {
  const [speechData,   setSpeechData]   = useState(null);
  const [memoryData,   setMemoryData]   = useState(null);
  const [reactionData, setReactionData] = useState(null);
  const [stroopData,   setStroopData]   = useState(null);
  const [tapData,      setTapData]      = useState(null);
  const [profile,      setProfile]      = useState(null);
  const [apiResult,    setApiResult]    = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);

  const completedCount = [speechData, memoryData, reactionData, stroopData, tapData].filter(Boolean).length;

  function reset() {
    setSpeechData(null); setMemoryData(null); setReactionData(null);
    setStroopData(null); setTapData(null);
    setApiResult(null);  setError(null);
  }

  return (
    <Ctx.Provider value={{
      speechData,   setSpeechData,
      memoryData,   setMemoryData,
      reactionData, setReactionData,
      stroopData,   setStroopData,
      tapData,      setTapData,
      profile,      setProfile,
      apiResult,    setApiResult,
      loading,      setLoading,
      error,        setError,
      completedCount,
      reset,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAssessment = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAssessment must be inside AssessmentProvider");
  return ctx;
};
