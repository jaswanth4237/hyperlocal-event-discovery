# Personalization Approach Comparison

## Implemented Approach: Implicit Content-Based Filtering with Time-Decay

The implemented personalization engine uses **Implicit Content-Based Filtering**. It tracks user interactions (signals) such as viewing an event or saving it, and uses these to build a preference profile for the user. 

### Key Characteristics:
1. **Implicit Signals**: Instead of asking users "What do you like?", we observe their behavior. Dwell time on event details and explicit "save" actions serve as indicators of interest.
2. **Category-Based Profiling**: Signals are aggregated by event category. If a user interacts with many "Music" events, their profile reflects a high affinity for that category.
3. **Time-Decay Ranking**: A decay function ($weight = e^{-k \cdot \Delta t}$) is applied to signals, ensuring that recent interests have a higher influence than old ones. This keeps the feed "fresh" and responsive to changing user tastes.
4. **Search Engine Boosting**: The calculated preferences are fed into the Typesense search engine as dynamic boosts, allowing the system to re-rank the global event list specifically for that user.

---

## Comparison: Content-Based vs. Collaborative Filtering

| Feature | Implicit Content-Based (Our approach) | Collaborative Filtering (User-User / Item-Item) |
| :--- | :--- | :--- |
| **Data Source** | User's own past behavior and item attributes (categories). | Patterns of behavior across *all* users in the system. |
| **Cold-Start (User)** | **Strong**: Can start recommending as soon as the user performs a few actions. | **Weak**: Requires a threshold of interactions to find "similar" users. |
| **Cold-Start (Item)** | **Strong**: New events are recommended based on their metadata (category). | **Weak**: New events can't be recommended until someone interacts with them. |
| **Complexity** | Relatively low; scales with the number of categories. | High; requires complex matrix factorization or similarity calculations. |
| **Diversity** | Can be limited to "more of the same" (filter bubble). | Better at "serendipitous" discovery (finding things you didn't know you'd like). |

---

## Why Content-Based is Better for Cold-Start Scenarios

The "Cold-Start" problem refers to the difficulty of providing recommendations when the system has little to no data about a user or a new item.

1. **User Cold-Start**: In a hyperlocal event app, users often visit sporadically. Collaborative filtering requires a large matrix of user-item interactions to find meaningful similarities. If a new user joins, the system has no peers to compare them to. Our content-based approach only needs 1-2 clicks to immediately start highlighting similar categories.
2. **Item Cold-Start**: Events are transient. A concert happening next week is a "new item" that will soon disappear. Collaborative filtering fails here because the event doesn't exist long enough to gather the interaction volume needed for neighbor-based recommendations. Content-based filtering, however, knows the event is "Jazz" and can immediately show it to Jazz lovers.
3. **Scalability and Real-time**: For a mobile "discovery" experience, latency is critical. Our approach allows for real-time profile updates that can be reflected in the next API call, whereas collaborative models often require heavy offline batch processing.

By choosing an implicit content-based model with time-decay, we ensure that the app feels "intelligent" from the very first session, while remaining responsive to the user's evolving interests over time.
