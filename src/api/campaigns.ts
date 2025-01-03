export type DndCampaign = {
  id: number;
  user_id: number;
  campaign_id: number;
  name: string;
  image_link: string | null;
  created_at: Date | null;
  last_updated: Date | null;
};

export type Result<T, E> =
  | {
      value: T;
      isError: false;
    }
  | {
      error: E;
      isError: true;
    };

export function ok<V>(value: V): Result<V, any> {
  return {
    value,
    isError: false,
  };
}

export function err<E>(error: E): Result<any, E> {
  return {
    error,
    isError: true,
  };
}

export async function getCampaigns(
  access_token: string,
): Promise<Result<DndCampaign[], { error: string }>> {
  const resp = await fetch("http://127.0.0.1:8080/api/get/campaigns/", {
    headers: { Authorization: "Bearer " + access_token },
  });

  if (resp.ok) {
    return ok((await resp.json()) as DndCampaign[]);
  } else {
    return err({ error: "Failed to fetch campaigns" });
  }
}
