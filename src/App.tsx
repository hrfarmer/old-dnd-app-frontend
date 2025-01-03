import { useQuery } from "@tanstack/react-query";
import { useContext } from "react";
import { StateContext } from "./context/StateContext";
import { getCampaigns } from "./api/campaigns";

export default function App() {
  const state = useContext(StateContext)!;
  const query = useQuery({
    queryKey: [state.access_token, "campaigns"],
    queryFn: async () => await getCampaigns(state.access_token),
  });

  console.log(query.data);
  console.log(query.isSuccess);

  return (
    <div className="flex flex-col p-3 h-full">
      <div className="flex w-full items-center justify-between">
        <h1 className="text-white text-4xl font-bold">Sessions</h1>
        <button className="bg-white rounded-md px-4 py-2">
          Create new Campaign
        </button>
      </div>
      {query.isSuccess && query.data.isError === false && (
        <div>
          <p>hi</p>
          <p>{JSON.stringify(query.data.value)}</p>
          {query.data.value.map((a) => (
            <div>
              <p>{a.name}</p>
              <p>{a.id}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
