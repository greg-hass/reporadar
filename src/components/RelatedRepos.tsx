import type { Repo } from "../lib/types";
import { useSearch } from "../hooks/useSearch";
import RepoRow from "./RepoRow";

/** A small, deliberately contextual discovery loop on the repo detail page. */
export default function RelatedRepos({ repo }: { repo: Repo }) {
  const topic = repo.topics[0];
  const query = topic ? `topic:${topic}` : repo.language ? `language:${repo.language}` : repo.fullName.split("/")[0];
  const { data, isLoading } = useSearch(
    {
      q: query,
      language: topic ? undefined : repo.language ?? undefined,
      sort: "stars",
    },
    Boolean(query),
  );

  const items = (data?.pages.flatMap((page) => page.items) ?? [])
    .filter((item) => item.fullName !== repo.fullName)
    .slice(0, 4);

  if (!isLoading && items.length === 0) return null;

  return (
    <section className="panel p-4 sm:p-5 animate-fade-up" aria-labelledby="related-repos-heading">
      <div className="flex items-end justify-between gap-3 mb-3">
        <div>
          <span className="eyebrow !text-[9px]">Keep exploring</span>
          <h2 id="related-repos-heading" className="font-semibold text-sm mt-1">
            Related repos
          </h2>
        </div>
        <span className="text-[11px] text-muted truncate max-w-[45%]">
          {topic ? `More on ${topic}` : repo.language ? `More ${repo.language}` : "From this owner"}
        </span>
      </div>
      {isLoading ? (
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 2 }, (_, index) => (
            <div key={index} className="panel-row panel-row-rich">
              <div className="skeleton h-11 w-11 !rounded-xl shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="skeleton h-4 w-2/3" />
                <div className="skeleton h-3 w-full max-w-md mt-2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {items.map((item) => (
            <RepoRow key={item.id} repo={item} />
          ))}
        </div>
      )}
    </section>
  );
}
