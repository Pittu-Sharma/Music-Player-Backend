const axios = require('axios');

class AnilistService {
  constructor() {
    this.apiUrl = 'https://graphql.anilist.co';
  }

  async fetchGraphQL(query, variables) {
    try {
      const response = await axios.post(this.apiUrl, { query, variables });
      return response.data.data;
    } catch (error) {
      console.error('[AnilistService] API Error:', error.response?.data || error.message);
      throw error;
    }
  }

  async searchAnime(searchTerm) {
    const query = `
      query ($search: String) {
        Page(page: 1, perPage: 10) {
          media(search: $search, type: ANIME) {
            id
            title {
              userPreferred
              english
              romaji
            }
            episodes
            nextAiringEpisode {
              episode
            }
            status
            genres
            description
            bannerImage
            coverImage {
              extraLarge
              large
            }
            averageScore
            seasonYear
          }
        }
      }
    `;
    const data = await this.fetchGraphQL(query, { search: searchTerm });
    return data.Page.media || [];
  }

  async getAnimeInfo(id) {
    const query = `
      query ($id: Int) {
        Media(id: $id, type: ANIME) {
          id
          title {
            userPreferred
            english
            romaji
          }
          episodes
          nextAiringEpisode {
            episode
          }
          status
          description
          bannerImage
          coverImage {
            extraLarge
            large
          }
          averageScore
          seasonYear
        }
      }
    `;
    const data = await this.fetchGraphQL(query, { id });
    return data.Media;
  }
}

module.exports = new AnilistService();
